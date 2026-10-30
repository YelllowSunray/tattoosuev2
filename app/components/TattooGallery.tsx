"use client";

import { useState, type MouseEvent } from "react";
import Image from "next/image";
import { TattooImage, getAlternatives } from "@/lib/firebase-utils";

interface TattooGalleryProps {
  images: TattooImage[];
  allImages: TattooImage[];
  showPriceDuration?: boolean;
  onStyleClick?: (styleId: number) => void;
  onCategoryClick?: (categoryId: number) => void;
  onBodyPartClick?: (bodyPart: string) => void;
  favoriteStyleIds?: number[];
  onImageClick?: (image: TattooImage) => void;
}

function formatLabel(text: string) {
  return text
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getDisplayName(image: TattooImage) {
  if (image.matchedStyle) {
    return image.matchedStyle.name;
  }
  return formatLabel(image.style);
}

function priceLine(image: TattooImage) {
  const parts: string[] = [];
  if (image.price !== undefined) parts.push(`$${image.price.toLocaleString()}`);
  if (image.duration !== undefined) parts.push(`${image.duration} hours`);
  return parts.join(" · ");
}

function StyleCaption({
  image,
  onStyleClick,
  showPriceDuration,
  compact = false,
  afterStyleClick,
}: {
  image: TattooImage;
  onStyleClick?: (styleId: number) => void;
  showPriceDuration?: boolean;
  compact?: boolean;
  afterStyleClick?: () => void;
}) {
  const styleName = getDisplayName(image);
  const meta = showPriceDuration ? priceLine(image) : "";

  const styleClass = compact
    ? "text-[13px] sm:text-sm"
    : "text-sm sm:text-[15px]";

  const handleStyleClick = (event: MouseEvent) => {
    event.stopPropagation();
    if (image.matchedStyle && onStyleClick) {
      onStyleClick(image.matchedStyle.id);
      afterStyleClick?.();
    }
  };

  return (
    <div className="min-w-0">
      {image.matchedStyle && onStyleClick ? (
        <button
          type="button"
          onClick={handleStyleClick}
          className={`block max-w-full text-left text-white font-light tracking-wide leading-snug hover:text-white/80 transition-colors ${styleClass}`}
        >
          {styleName}
        </button>
      ) : (
        <p
          className={`text-white font-light tracking-wide leading-snug ${styleClass}`}
        >
          {styleName}
        </p>
      )}
      {meta ? (
        <p
          className={`text-white/50 font-light ${
            compact ? "text-[10px] mt-1" : "text-[11px] mt-1.5"
          }`}
        >
          {meta}
        </p>
      ) : null}
    </div>
  );
}

export default function TattooGallery({
  images,
  allImages,
  showPriceDuration = true,
  onStyleClick,
  favoriteStyleIds = [],
  onImageClick,
}: TattooGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<TattooImage | null>(null);
  const [alternatives, setAlternatives] = useState<TattooImage[]>([]);

  const handleImageClick = (image: TattooImage) => {
    if (onImageClick) {
      onImageClick(image);
      return;
    }
    setSelectedImage(image);
    setAlternatives(getAlternatives(allImages, image, 8));
  };

  if (images.length === 0) {
    return (
      <div className="text-center py-24">
        <div className="text-white/20 text-5xl mb-6">○</div>
        <h3 className="text-white/60 text-lg font-light mb-2 tracking-wide">
          No designs found
        </h3>
        <p className="text-white/30 text-sm font-light">
          Try adjusting your filters
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {images.map((image) => {
          const isFavorited =
            image.matchedStyle &&
            favoriteStyleIds.includes(image.matchedStyle.id);
          return (
            <div
              key={image.fileName}
              onClick={() => handleImageClick(image)}
              className={`group relative aspect-square overflow-hidden cursor-pointer border transition-all duration-500 ${
                isFavorited
                  ? "border-white/40 ring-2 ring-white/20"
                  : "border-white/5 hover:border-white/10"
              }`}
            >
              <Image
                src={image.url}
                alt={`${getDisplayName(image)} tattoo`}
                fill
                loading="lazy"
                quality={85}
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
              />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/35 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 pointer-events-auto">
                <StyleCaption
                  image={image}
                  onStyleClick={onStyleClick}
                  showPriceDuration={showPriceDuration}
                />
              </div>
              {isFavorited && (
                <div className="absolute top-2 right-2 bg-white text-black px-2 py-1 text-[10px] font-medium">
                  ✓ Favorited
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-[9997] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-[2px]"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="w-full sm:max-w-4xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl border border-white/10 bg-zinc-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/10 bg-zinc-950/95 px-4 py-3 backdrop-blur-sm">
              <StyleCaption
                image={selectedImage}
                onStyleClick={onStyleClick}
                afterStyleClick={() => setSelectedImage(null)}
              />
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="text-white/50 hover:text-white text-2xl leading-none w-11 h-11 flex items-center justify-center shrink-0"
                aria-label="Close preview"
              >
                ×
              </button>
            </div>
            <div className="p-4 sm:p-8">
              <div className="relative aspect-square max-w-2xl mx-auto border border-white/10">
                <Image
                  src={selectedImage.url}
                  alt={`${getDisplayName(selectedImage)} tattoo`}
                  fill
                  loading="eager"
                  priority
                  quality={90}
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 800px"
                />
              </div>
              {showPriceDuration &&
                (selectedImage.price !== undefined ||
                  selectedImage.duration !== undefined) && (
                  <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-white/10">
                    {selectedImage.price !== undefined && (
                      <div>
                        <p className="text-white/40 text-xs font-light uppercase tracking-[0.15em] mb-1">
                          Price
                        </p>
                        <p className="text-white text-xl font-light">
                          ${selectedImage.price.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {selectedImage.duration !== undefined && (
                      <div>
                        <p className="text-white/40 text-xs font-light uppercase tracking-[0.15em] mb-1">
                          Duration
                        </p>
                        <p className="text-white text-xl font-light">
                          {selectedImage.duration} hours
                        </p>
                      </div>
                    )}
                  </div>
                )}

              {alternatives.length > 0 && (
                <div className="mt-8">
                  <h4 className="text-xs text-white/40 mb-6 uppercase tracking-[0.15em] font-light">
                    Alternatives
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {alternatives.map((alt) => (
                      <div
                        key={alt.fileName}
                        onClick={() => {
                          setSelectedImage(alt);
                          setAlternatives(getAlternatives(allImages, alt, 8));
                        }}
                        className="group relative aspect-square overflow-hidden cursor-pointer border border-white/5 hover:border-white/20 transition-all duration-300"
                      >
                        <Image
                          src={alt.url}
                          alt={`${getDisplayName(alt)} tattoo`}
                          fill
                          loading="lazy"
                          quality={80}
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          placeholder="blur"
                          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                        />
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/35 to-transparent pointer-events-none" />
                        <div className="absolute bottom-0 left-0 right-0 p-2.5 pointer-events-auto">
                          <StyleCaption
                            image={alt}
                            onStyleClick={onStyleClick}
                            showPriceDuration={showPriceDuration}
                            compact
                            afterStyleClick={() => setSelectedImage(null)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

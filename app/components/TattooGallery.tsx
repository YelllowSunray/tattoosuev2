'use client';

import { useState } from 'react';
import Image from 'next/image';
import { TattooImage, getAlternatives } from '@/lib/firebase-utils';

interface TattooGalleryProps {
  images: TattooImage[];
  allImages: TattooImage[];
  showPriceDuration?: boolean;
  onStyleClick?: (styleId: number) => void;
  onCategoryClick?: (categoryId: number) => void;
  onBodyPartClick?: (bodyPart: string) => void;
  favoriteStyleIds?: number[]; // Optional: array of favorited style IDs for visual feedback
  onImageClick?: (image: TattooImage) => void; // Optional: custom handler for image clicks (overrides default modal)
}

export default function TattooGallery({ images, allImages, showPriceDuration = true, onStyleClick, onCategoryClick, onBodyPartClick, favoriteStyleIds = [], onImageClick }: TattooGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<TattooImage | null>(null);
  const [alternatives, setAlternatives] = useState<TattooImage[]>([]);

  const handleImageClick = (image: TattooImage) => {
    // If custom onImageClick handler is provided, use it instead of opening modal
    if (onImageClick) {
      onImageClick(image);
      return;
    }
    // Default behavior: open modal
    setSelectedImage(image);
    const altImages = getAlternatives(allImages, image, 8);
    setAlternatives(altImages);
  };

  const formatLabel = (text: string) => {
    return text
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getDisplayName = (image: TattooImage) => {
    if (image.matchedStyle) {
      return image.matchedStyle.name;
    }
    return formatLabel(image.style);
  };
  const filterPillClass =
    'inline-flex items-center rounded-full border border-white/25 bg-black/50 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm transition-colors hover:border-white/50 hover:bg-black/70 hover:text-white';

  const handleStyleFilter = (e: React.MouseEvent, styleId: number) => {
    e.stopPropagation();
    onStyleClick?.(styleId);
  };

  const handleCategoryFilter = (e: React.MouseEvent, categoryId: number) => {
    e.stopPropagation();
    onCategoryClick?.(categoryId);
  };

  const handleBodyPartFilter = (e: React.MouseEvent, bodyPart: string) => {
    e.stopPropagation();
    onBodyPartClick?.(bodyPart);
  };

  if (images.length === 0) {
    return (
      <div className="text-center py-24">
        <div className="text-white/20 text-5xl mb-6">○</div>
        <h3 className="text-white/60 text-lg font-light mb-2 tracking-wide">No designs found</h3>
        <p className="text-white/30 text-sm font-light">Try adjusting your filters</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {images.map((image) => {
          const isFavorited = image.matchedStyle && favoriteStyleIds.includes(image.matchedStyle.id);
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
              alt={`${formatLabel(image.style)} ${image.bodyPart} tattoo`}
              fill
              loading="lazy"
              quality={85}
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
              <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2 pointer-events-auto">
                <div className="flex flex-wrap gap-1.5">
                  {image.matchedStyle && onStyleClick ? (
                    <button
                      type="button"
                      onClick={(e) => handleStyleFilter(e, image.matchedStyle!.id)}
                      className={filterPillClass}
                    >
                      {getDisplayName(image)}
                    </button>
                  ) : (
                    <span className={`${filterPillClass} pointer-events-none`}>
                      {getDisplayName(image)}
                    </span>
                  )}
                  {image.category && onCategoryClick ? (
                    <button
                      type="button"
                      onClick={(e) => handleCategoryFilter(e, image.category!.id)}
                      className={filterPillClass}
                    >
                      {image.category.name}
                    </button>
                  ) : image.category ? (
                    <span className={`${filterPillClass} pointer-events-none`}>
                      {image.category.name}
                    </span>
                  ) : null}
                  {onBodyPartClick ? (
                    <button
                      type="button"
                      onClick={(e) => handleBodyPartFilter(e, image.bodyPart)}
                      className={`${filterPillClass} pointer-events-auto capitalize`}
                    >
                      {image.bodyPart}
                    </button>
                  ) : (
                    <span className={`${filterPillClass} pointer-events-none capitalize`}>
                      {image.bodyPart}
                    </span>
                  )}
                </div>
                {showPriceDuration && (image.price !== undefined || image.duration !== undefined) && (
                  <div className="flex items-center gap-3 pt-1 border-t border-white/10">
                    {image.price !== undefined && (
                      <p className="text-white text-xs font-medium">
                        ${image.price.toLocaleString()}
                      </p>
                    )}
                    {image.duration !== undefined && (
                      <p className="text-white/60 text-xs font-light">
                        {image.duration} hours
                      </p>
                    )}
                  </div>
                )}
                <p className="text-[10px] text-white/40 uppercase tracking-wider pointer-events-none">
                  Tap image to preview
                </p>
              </div>
            </div>
            {isFavorited && (
              <div className="absolute top-2 right-2 bg-white text-black px-2 py-1 text-[10px] font-medium rounded">
                ✓ Favorited
              </div>
            )}
          </div>
        );
        })}
      </div>

      {/* Modal for selected image and alternatives */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[9997] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-[2px]"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="w-full sm:max-w-4xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-xl border border-white/10 bg-zinc-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-zinc-950/95 px-4 py-3 backdrop-blur-sm">
              <p className="text-sm text-white/60 font-light">Design preview</p>
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="text-white/50 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center"
                aria-label="Close preview"
              >
                ×
              </button>
            </div>
            <div className="p-4 sm:p-8">
              <div className="relative aspect-square max-w-2xl mx-auto border border-white/10">
                <Image
                  src={selectedImage.url}
                  alt={`${formatLabel(selectedImage.style)} ${selectedImage.bodyPart} tattoo`}
                  fill
                  loading="eager"
                  priority
                  quality={90}
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 800px"
                />
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {selectedImage.matchedStyle && onStyleClick ? (
                  <button
                    type="button"
                    onClick={() => {
                      onStyleClick(selectedImage.matchedStyle!.id);
                      setSelectedImage(null);
                    }}
                    className={`${filterPillClass} text-sm px-3 py-1.5`}
                  >
                    {getDisplayName(selectedImage)}
                  </button>
                ) : (
                  <span className={`${filterPillClass} text-sm px-3 py-1.5 pointer-events-none`}>
                    {getDisplayName(selectedImage)}
                  </span>
                )}
                {selectedImage.category && onCategoryClick ? (
                  <button
                    type="button"
                    onClick={() => {
                      onCategoryClick(selectedImage.category!.id);
                      setSelectedImage(null);
                    }}
                    className={filterPillClass}
                  >
                    {selectedImage.category.name}
                  </button>
                ) : selectedImage.category ? (
                  <span className={`${filterPillClass} pointer-events-none`}>
                    {selectedImage.category.name}
                  </span>
                ) : null}
                {onBodyPartClick ? (
                  <button
                    type="button"
                    onClick={() => {
                      onBodyPartClick(selectedImage.bodyPart);
                      setSelectedImage(null);
                    }}
                    className={`${filterPillClass} capitalize`}
                  >
                    {selectedImage.bodyPart}
                  </button>
                ) : (
                  <span className={`${filterPillClass} capitalize pointer-events-none`}>
                    {selectedImage.bodyPart}
                  </span>
                )}
              </div>
              {showPriceDuration && (selectedImage.price !== undefined || selectedImage.duration !== undefined) && (
                <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-white/10">
                  {selectedImage.price !== undefined && (
                    <div>
                      <p className="text-white/40 text-xs font-light uppercase tracking-[0.15em] mb-1">Price</p>
                      <p className="text-white text-xl font-light">
                        ${selectedImage.price.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {selectedImage.duration !== undefined && (
                    <div>
                      <p className="text-white/40 text-xs font-light uppercase tracking-[0.15em] mb-1">Duration</p>
                      <p className="text-white text-xl font-light">
                        {selectedImage.duration} hours
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Alternatives */}
              {alternatives.length > 0 && (
                <div>
                  <h4 className="text-xs text-white/40 mb-6 uppercase tracking-[0.15em] font-light">
                    Alternatives
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {alternatives.map((alt) => (
                      <div
                        key={alt.fileName}
                        onClick={() => {
                          setSelectedImage(alt);
                          const newAlts = getAlternatives(allImages, alt, 8);
                          setAlternatives(newAlts);
                        }}
                        className="group relative aspect-square overflow-hidden cursor-pointer border border-white/5 hover:border-white/20 transition-all duration-300"
                      >
                        <Image
                          src={alt.url}
                          alt={`${formatLabel(alt.style)} ${alt.bodyPart} tattoo`}
                          fill
                          loading="lazy"
                          quality={80}
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          placeholder="blur"
                          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            {alt.matchedStyle && onStyleClick ? (
                              <p 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onStyleClick(alt.matchedStyle!.id);
                                  setSelectedImage(null);
                                }}
                                className="text-white text-xs font-light mb-0.5 hover:text-white/80 cursor-pointer transition-colors"
                              >
                                {getDisplayName(alt)}
                              </p>
                            ) : (
                              <p className="text-white text-xs font-light mb-0.5">
                                {getDisplayName(alt)}
                              </p>
                            )}
                            {alt.category && onCategoryClick ? (
                              <p 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onCategoryClick(alt.category!.id);
                                  setSelectedImage(null);
                                }}
                                className="text-white/50 text-xs font-light mb-0.5 hover:text-white/70 cursor-pointer transition-colors"
                              >
                                {alt.category.name}
                              </p>
                            ) : alt.category ? (
                              <p className="text-white/50 text-xs font-light mb-0.5">
                                {alt.category.name}
                              </p>
                            ) : null}
                            {onBodyPartClick ? (
                              <p 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onBodyPartClick(alt.bodyPart);
                                  setSelectedImage(null);
                                }}
                                className="text-white/60 text-xs font-light capitalize mb-1 hover:text-white/80 cursor-pointer transition-colors"
                              >
                                {alt.bodyPart}
                              </p>
                            ) : (
                              <p className="text-white/60 text-xs font-light capitalize mb-1">{alt.bodyPart}</p>
                            )}
                            {showPriceDuration && (alt.price !== undefined || alt.duration !== undefined) && (
                              <div className="flex items-center gap-2 mt-1 pt-1 border-t border-white/10">
                                {alt.price !== undefined && (
                                  <p className="text-white text-[10px] font-medium">
                                    ${alt.price.toLocaleString()}
                                  </p>
                                )}
                                {alt.duration !== undefined && (
                                  <p className="text-white/60 text-[10px] font-light">
                                    {alt.duration}h
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
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

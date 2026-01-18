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
}

export default function TattooGallery({ images, allImages, showPriceDuration = true, onStyleClick, onCategoryClick, onBodyPartClick }: TattooGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<TattooImage | null>(null);
  const [alternatives, setAlternatives] = useState<TattooImage[]>([]);

  const handleImageClick = (image: TattooImage) => {
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
        {images.map((image) => (
          <div
            key={image.fileName}
            onClick={() => handleImageClick(image)}
            className="group relative aspect-square overflow-hidden cursor-pointer border border-white/5 hover:border-white/10 transition-all duration-500"
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p className="text-white text-sm font-light mb-1 tracking-wide">
                  {getDisplayName(image)}
                </p>
                {image.category && (
                  <p className="text-white/50 text-xs font-light mb-1 tracking-wide">
                    {image.category.name}
                  </p>
                )}
                <p className="text-white/60 text-xs font-light capitalize tracking-wide mb-2">{image.bodyPart}</p>
                {showPriceDuration && (image.price !== undefined || image.duration !== undefined) && (
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/10">
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
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal for selected image and alternatives */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/95 backdrop-blur-sm"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="max-w-6xl w-full max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-black border border-white/10 p-8 md:p-12">
              {/* Close button */}
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-6 right-6 text-white/40 hover:text-white/80 text-3xl font-light w-10 h-10 flex items-center justify-center transition-colors z-10"
              >
                ×
              </button>

              {/* Main image */}
              <div className="mb-12">
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
                <div className="mt-8 text-center">
                  {selectedImage.matchedStyle && onStyleClick ? (
                    <h3 
                      onClick={() => {
                        onStyleClick(selectedImage.matchedStyle!.id);
                        setSelectedImage(null);
                      }}
                      className="text-3xl md:text-4xl font-light text-white mb-2 tracking-tight hover:text-white/80 cursor-pointer transition-colors"
                    >
                      {getDisplayName(selectedImage)}
                    </h3>
                  ) : (
                    <h3 className="text-3xl md:text-4xl font-light text-white mb-2 tracking-tight">
                      {getDisplayName(selectedImage)}
                    </h3>
                  )}
                  {selectedImage.category && onCategoryClick ? (
                    <p 
                      onClick={() => {
                        onCategoryClick(selectedImage.category!.id);
                        setSelectedImage(null);
                      }}
                      className="text-white/60 text-sm font-light mb-2 tracking-wide hover:text-white/80 cursor-pointer transition-colors"
                    >
                      {selectedImage.category.name}
                    </p>
                  ) : selectedImage.category ? (
                    <p className="text-white/60 text-sm font-light mb-2 tracking-wide">
                      {selectedImage.category.name}
                    </p>
                  ) : null}
                  {onBodyPartClick ? (
                    <p 
                      onClick={() => {
                        onBodyPartClick(selectedImage.bodyPart);
                        setSelectedImage(null);
                      }}
                      className="text-white/50 text-sm font-light uppercase tracking-[0.15em] mb-4 hover:text-white/80 cursor-pointer transition-colors"
                    >
                      {selectedImage.bodyPart}
                    </p>
                  ) : (
                    <p className="text-white/50 text-sm font-light uppercase tracking-[0.15em] mb-4">{selectedImage.bodyPart}</p>
                  )}
                  {showPriceDuration && (selectedImage.price !== undefined || selectedImage.duration !== undefined) && (
                    <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-white/10">
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
                </div>
              </div>

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
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
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

'use client';

import { useState, useEffect } from 'react';
import { TattooCategory, TattooStyle } from '@/lib/tattoo-categories';
import { TattooImage, getAvailableCategories, getStylesInCategory } from '@/lib/firebase-utils';

interface TattooFilterProps {
  images: TattooImage[];
  bodyParts: string[];
  selectedCategoryId?: number;
  selectedStyleId?: number;
  selectedBodyPart?: string;
  onCategoryChange: (categoryId?: number) => void;
  onStyleChange: (styleId?: number) => void;
  onBodyPartChange: (bodyPart?: string) => void;
  onClearAll?: () => void;
}

export default function TattooFilter({
  images,
  bodyParts,
  selectedCategoryId,
  selectedStyleId,
  selectedBodyPart,
  onCategoryChange,
  onStyleChange,
  onBodyPartChange,
  onClearAll,
}: TattooFilterProps) {
  const [expandedCategory, setExpandedCategory] = useState<number | null>(selectedCategoryId || null);
  
  const availableCategories = getAvailableCategories(images);
  const stylesInSelectedCategory = selectedCategoryId 
    ? getStylesInCategory(images, selectedCategoryId)
    : [];

  // Auto-expand category when it's selected (e.g., when clicking style from gallery)
  useEffect(() => {
    if (selectedCategoryId && expandedCategory !== selectedCategoryId) {
      setExpandedCategory(selectedCategoryId);
    }
  }, [selectedCategoryId, expandedCategory]);

  const toggleCategory = (categoryId: number) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null);
      onCategoryChange(undefined);
      onStyleChange(undefined);
    } else {
      setExpandedCategory(categoryId);
      onCategoryChange(categoryId);
      onStyleChange(undefined);
    }
  };

  return (
    <div className="space-y-6 max-h-full">
      {/* Body Part Selection */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-xs text-white/40 uppercase tracking-[0.15em] font-light">
            Placement
          </label>
          {onClearAll && (selectedCategoryId || selectedStyleId || selectedBodyPart) && (
            <button
              onClick={onClearAll}
              className="text-xs text-white/60 hover:text-white transition-colors font-light uppercase tracking-wider"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onBodyPartChange(undefined)}
            className={`px-4 py-2 text-sm font-light transition-all duration-200 ${
              !selectedBodyPart
                ? 'bg-white text-black border border-white/20'
                : 'bg-white/5 text-white/60 border border-white/10 hover:border-white/20 hover:text-white/80'
            }`}
          >
            All
          </button>
          {bodyParts.map((bodyPart) => (
            <button
              key={bodyPart}
              onClick={() => onBodyPartChange(bodyPart === selectedBodyPart ? undefined : bodyPart)}
              className={`px-4 py-2 text-sm font-light transition-all duration-200 capitalize ${
                selectedBodyPart === bodyPart
                  ? 'bg-white text-black border border-white/20'
                  : 'bg-white/5 text-white/60 border border-white/10 hover:border-white/20 hover:text-white/80'
              }`}
            >
              {bodyPart}
            </button>
          ))}
        </div>
      </div>

      {/* Category Selection */}
      <div>
        <label className="block text-xs text-white/40 mb-3 uppercase tracking-[0.15em] font-light">
          Category
        </label>
        <div className="space-y-1">
          <button
            onClick={() => {
              onCategoryChange(undefined);
              onStyleChange(undefined);
              setExpandedCategory(null);
            }}
            className={`w-full px-4 py-2 text-sm font-light transition-all duration-200 text-left ${
              !selectedCategoryId
                ? 'bg-white text-black border border-white/20'
                : 'bg-white/5 text-white/60 border border-white/10 hover:border-white/20 hover:text-white/80'
            }`}
          >
            All Categories
          </button>
          
          {availableCategories.map((category) => {
            const isExpanded = expandedCategory === category.id;
            const isSelected = selectedCategoryId === category.id;
            const categoryImages = images.filter(img => img.category?.id === category.id);
            const count = categoryImages.length;
            
            return (
              <div key={category.id} className="border border-white/10">
                <button
                  onClick={() => toggleCategory(category.id)}
                  className={`w-full px-4 py-2.5 text-sm font-light transition-all duration-200 text-left flex items-center justify-between ${
                    isSelected
                      ? 'bg-white/10 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-white/40 text-xs">{isExpanded ? '▼' : '▶'}</span>
                    <span>
                      {category.name}
                      {count > 0 && (
                        <span className="ml-2 text-white/40 text-xs font-normal">({count})</span>
                      )}
                    </span>
                  </span>
                </button>
                
                {isExpanded && stylesInSelectedCategory.length > 0 && (
                  <div className="bg-black/80 border-t border-white/10 p-3 space-y-1">
                    <button
                      onClick={() => onStyleChange(undefined)}
                      className={`w-full px-3 py-1.5 text-xs font-light transition-all duration-200 text-left ${
                        !selectedStyleId
                          ? 'bg-white/15 text-white border-l-2 border-white'
                          : 'bg-white/5 text-white/60 border-l-2 border-transparent hover:bg-white/10 hover:text-white/80'
                      }`}
                    >
                      All Styles
                    </button>
                    <div className="space-y-1">
                      {stylesInSelectedCategory.map((style) => {
                        const styleImages = images.filter(img => img.matchedStyle?.id === style.id);
                        const styleCount = styleImages.length;
                        
                        return (
                          <button
                            key={style.id}
                            onClick={() => onStyleChange(style.id === selectedStyleId ? undefined : style.id)}
                            className={`w-full px-3 py-1.5 text-xs font-light transition-all duration-200 text-left ${
                              selectedStyleId === style.id
                                ? 'bg-white text-black border-l-2 border-white'
                                : 'bg-white/5 text-white/60 border-l-2 border-transparent hover:bg-white/10 hover:text-white/80'
                            }`}
                          >
                            <span className="flex items-center justify-between">
                              <span className="truncate">{style.name}</span>
                              {styleCount > 0 && (
                                <span className="ml-2 text-white/40 text-xs shrink-0">({styleCount})</span>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

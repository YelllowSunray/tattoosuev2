'use client';

import { useState, useEffect } from 'react';
import TattooFilter from './components/TattooFilter';
import TattooGallery from './components/TattooGallery';
import { getAllTattooImages, getUniqueBodyParts, filterTattoos, TattooImage } from '@/lib/firebase-utils';

export default function Home() {
  const [allImages, setAllImages] = useState<TattooImage[]>([]);
  const [filteredImages, setFilteredImages] = useState<TattooImage[]>([]);
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>();
  const [selectedStyleId, setSelectedStyleId] = useState<number | undefined>();
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [images, uniqueBodyParts] = await Promise.all([
          getAllTattooImages(),
          getUniqueBodyParts(),
        ]);
        
        setAllImages(images);
        setFilteredImages(images);
        setBodyParts(uniqueBodyParts);
      } catch (error) {
        console.error('Error loading tattoo data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    const filtered = filterTattoos(allImages, selectedCategoryId, selectedStyleId, selectedBodyPart);
    setFilteredImages(filtered);
  }, [allImages, selectedCategoryId, selectedStyleId, selectedBodyPart]);

  return (
    <div className="min-h-screen bg-black">
      {/* Subtle background pattern */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)] pointer-events-none" />
      
      {/* Header */}
      <header className="relative border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-4">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-light tracking-tight mb-2">
              <span className="bg-gradient-to-r from-white via-white/90 to-white/80 bg-clip-text text-transparent">
                Sue's Tattoo
              </span>
            </h1>
            <p className="text-white/50 text-xs md:text-sm font-light tracking-wide uppercase letter-spacing-wider">
              Discover Your Perfect Design
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex">
        {/* Sidebar */}
        <aside className="hidden lg:block w-80 border-r border-white/5 bg-black/40 backdrop-blur-sm sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-white/20 border-t-white/60 mb-4"></div>
                  <p className="text-white/40 text-xs font-light">Loading...</p>
                </div>
              </div>
            ) : (
              <TattooFilter
                images={allImages}
                bodyParts={bodyParts}
                selectedCategoryId={selectedCategoryId}
                selectedStyleId={selectedStyleId}
                selectedBodyPart={selectedBodyPart}
                onCategoryChange={setSelectedCategoryId}
                onStyleChange={setSelectedStyleId}
                onBodyPartChange={setSelectedBodyPart}
              />
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12 w-full">
          {loading ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-2 border-white/20 border-t-white/60 mb-6"></div>
                <p className="text-white/40 text-sm font-light tracking-wide">Loading designs...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Results Count */}
              <div className="mb-8 flex items-center justify-between">
                <p className="text-white/40 text-sm font-light">
                  <span className="text-white/60 font-normal">{filteredImages.length}</span>{' '}
                  {filteredImages.length === 1 ? 'design' : 'designs'}
                </p>
                {(selectedCategoryId || selectedStyleId || selectedBodyPart) && (
                  <button
                    onClick={() => {
                      setSelectedCategoryId(undefined);
                      setSelectedStyleId(undefined);
                      setSelectedBodyPart(undefined);
                    }}
                    className="text-xs text-white/40 hover:text-white/60 transition-colors font-light uppercase tracking-wider"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Gallery */}
              <TattooGallery images={filteredImages} allImages={allImages} />
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative mt-24 border-t border-white/5 py-12">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 text-center">
          <p className="text-white/30 text-xs font-light tracking-wide">
            © {new Date().getFullYear()} Sue's Tattoo Studio
          </p>
        </div>
      </footer>
    </div>
  );
}

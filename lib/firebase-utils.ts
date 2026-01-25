import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';
import { matchStyleToCategory, TattooCategory, TattooStyle } from './tattoo-categories';

export interface TattooImage {
  url: string;
  style: string; // Original style string from filename
  bodyPart: string;
  fileName: string;
  category?: TattooCategory; // Matched category
  matchedStyle?: TattooStyle; // Matched style
  price?: number; // Price in cents or base currency unit
  duration?: number; // Duration in minutes
}

export interface TattooImageFilters {
  bodyPart?: string;
  categoryId?: number;
  styleId?: number;
  searchQuery?: string;
}

/**
 * Fetches tattoo images from Firebase Storage with optional filtering
 * Filters are applied at the filename level before fetching download URLs for better performance
 * @param folderPath - Optional folder path in Firebase Storage (default: '/')
 * @param filters - Optional filters to apply before fetching URLs
 * Note: If images are in a subfolder, specify it like 'tattoos/' or 'images/'
 */
export async function getAllTattooImages(
  folderPath: string = '/',
  filters?: TattooImageFilters
): Promise<TattooImage[]> {
  try {
    // Try root path first, then common folder names
    const pathsToTry = folderPath !== '/' ? [folderPath] : ['/', 'tattoos/', 'images/', 'designs/'];
    
    for (const path of pathsToTry) {
      try {
        const normalizedPath = path === '/' ? '/' : path.endsWith('/') ? path : `${path}/`;
        const imagesRef = ref(storage, normalizedPath);
        const result = await listAll(imagesRef);
        
        if (result.items.length > 0) {
          console.log(`Found ${result.items.length} images in Firebase Storage at path: ${normalizedPath}`);
          
          // Filter items by filename BEFORE fetching URLs (much faster)
          let itemsToProcess = result.items;
          
          if (filters) {
            itemsToProcess = result.items.filter((itemRef) => {
              const fileName = itemRef.name.toLowerCase();
              
              // Filter by bodyPart (filename format: style_bodypart.png)
              if (filters.bodyPart) {
                const bodyPartLower = filters.bodyPart.toLowerCase();
                const bodyPartPattern = `_${bodyPartLower}.`;
                if (!fileName.includes(bodyPartPattern)) {
                  return false;
                }
              }
              
              // For categoryId/styleId/searchQuery, we need to parse the filename
              // But we can do a quick check first to avoid unnecessary parsing
              if (filters.categoryId || filters.styleId || filters.searchQuery) {
                const [style] = itemRef.name.split('_');
                const styleLower = style?.toLowerCase() || '';
                
                // Quick search query check on filename
                if (filters.searchQuery) {
                  const query = filters.searchQuery.toLowerCase();
                  if (!fileName.includes(query) && !styleLower.includes(query)) {
                    return false;
                  }
                }
                
                // For categoryId/styleId, we need to match the style
                // This is a bit more expensive, but still better than fetching URLs
                if (filters.categoryId || filters.styleId) {
                  const match = matchStyleToCategory(style || '');
                  
                  if (filters.categoryId && match?.category.id !== filters.categoryId) {
                    return false;
                  }
                  
                  if (filters.styleId && match?.style.id !== filters.styleId) {
                    return false;
                  }
                }
              }
              
              return true;
            });
          }
          
          console.log(`Filtered to ${itemsToProcess.length} images matching filters`);
          
          // Only fetch URLs for filtered items
          const imagePromises: Promise<TattooImage | null>[] = itemsToProcess.map(async (itemRef) => {
            try {
              const url = await getDownloadURL(itemRef);
              const fileName = itemRef.name;
              
              // Parse filename: style_bodypart.png
              const [style, bodyPartWithExt] = fileName.split('_');
              const bodyPart = bodyPartWithExt?.replace(/\.(png|jpg|jpeg|webp)$/i, '') || '';
              
              // Match style to category
              const match = matchStyleToCategory(style || '');
              
              const image: TattooImage = {
                url,
                style: style || '',
                bodyPart,
                fileName,
                category: match?.category,
                matchedStyle: match?.style,
              };
              
              // Final search query check (more thorough, includes category/style names)
              if (filters?.searchQuery) {
                const query = filters.searchQuery.toLowerCase().trim();
                const styleName = image.matchedStyle?.name?.toLowerCase() || image.style?.toLowerCase() || "";
                const categoryName = image.category?.name?.toLowerCase() || "";
                const bodyPartName = image.bodyPart?.toLowerCase() || "";
                
                const matchesSearch = 
                  styleName.includes(query) ||
                  categoryName.includes(query) ||
                  bodyPartName.includes(query) ||
                  fileName.toLowerCase().includes(query);
                
                if (!matchesSearch) {
                  return null; // Filter out this image
                }
              }
              
              return image;
            } catch (error) {
              console.error(`Error processing image ${itemRef.name}:`, error);
              return null;
            }
          });
          
          const images = await Promise.all(imagePromises);
          return images.filter((img): img is TattooImage => img !== null);
        }
      } catch (pathError: any) {
        // If this path fails, try the next one
        if (pathError?.code === 'storage/unauthorized' || pathError?.code === 'storage/object-not-found') {
          continue;
        }
        throw pathError;
      }
    }
    
    // If we get here, no path worked
    throw new Error('No images found in Firebase Storage. Please check your Storage rules and file paths.');
  } catch (error: any) {
    console.error('Error fetching tattoo images from Firebase Storage:', error);
    
    if (error?.code === 'storage/unauthorized') {
      console.error(`
╔══════════════════════════════════════════════════════════════╗
║  FIREBASE STORAGE PERMISSION ERROR                          ║
╠══════════════════════════════════════════════════════════════╣
║  Your Firebase Storage rules need to allow public read       ║
║  access. Please update your Storage rules in Firebase       ║
║  Console:                                                    ║
║                                                              ║
║  1. Go to Firebase Console → Storage → Rules                ║
║  2. Update rules to allow public read:                      ║
║                                                              ║
║  rules_version = '2';                                       ║
║  service firebase.storage {                                 ║
║    match /b/{bucket}/o {                                    ║
║      match /{allPaths=**} {                                 ║
║        allow read: if true;                                  ║
║        allow write: if false;                               ║
║      }                                                       ║
║    }                                                         ║
║  }                                                           ║
╚══════════════════════════════════════════════════════════════╝
      `);
    }
    
    return [];
  }
}

/**
 * Gets unique body parts from filenames without fetching download URLs
 * Much faster than fetching all images - only parses filenames
 */
export async function getBodyPartsList(folderPath: string = '/'): Promise<string[]> {
  try {
    const pathsToTry = folderPath !== '/' ? [folderPath] : ['/', 'tattoos/', 'images/', 'designs/'];
    
    for (const path of pathsToTry) {
      try {
        const normalizedPath = path === '/' ? '/' : path.endsWith('/') ? path : `${path}/`;
        const imagesRef = ref(storage, normalizedPath);
        const result = await listAll(imagesRef);
        
        if (result.items.length > 0) {
          // Parse filenames to extract body parts (no URL fetching needed - much faster)
          const bodyParts = new Set<string>();
          
          result.items.forEach((itemRef) => {
            const fileName = itemRef.name;
            // Parse filename: style_bodypart.png
            const [, bodyPartWithExt] = fileName.split('_');
            if (bodyPartWithExt) {
              const bodyPart = bodyPartWithExt.replace(/\.(png|jpg|jpeg|webp)$/i, '');
              if (bodyPart) {
                bodyParts.add(bodyPart);
              }
            }
          });
          
          return Array.from(bodyParts).sort();
        }
      } catch (pathError: any) {
        // If this path fails, try the next one
        if (pathError?.code === 'storage/unauthorized' || pathError?.code === 'storage/object-not-found') {
          continue;
        }
        throw pathError;
      }
    }
    
    // If we get here, no path worked
    return [];
  } catch (error) {
    console.error('Error fetching body parts list:', error);
    return [];
  }
}

/**
 * Gets unique styles from all images (original style strings)
 */
export async function getUniqueStyles(): Promise<string[]> {
  const images = await getAllTattooImages();
  const styles = new Set(images.map(img => img.style).filter(Boolean));
  return Array.from(styles).sort();
}

/**
 * Gets available categories from images
 */
export function getAvailableCategories(images: TattooImage[]): TattooCategory[] {
  const categoryMap = new Map<number, TattooCategory>();
  images.forEach(img => {
    if (img.category) {
      categoryMap.set(img.category.id, img.category);
    }
  });
  return Array.from(categoryMap.values()).sort((a, b) => a.id - b.id);
}

/**
 * Gets available styles in a category
 */
export function getStylesInCategory(images: TattooImage[], categoryId: number): TattooStyle[] {
  const styleMap = new Map<number, TattooStyle>();
  images.forEach(img => {
    if (img.category?.id === categoryId && img.matchedStyle) {
      styleMap.set(img.matchedStyle.id, img.matchedStyle);
    }
  });
  return Array.from(styleMap.values()).sort((a, b) => a.id - b.id);
}

/**
 * Gets unique body parts from all images
 */
export async function getUniqueBodyParts(): Promise<string[]> {
  const images = await getAllTattooImages();
  const bodyParts = new Set(images.map(img => img.bodyPart).filter(Boolean));
  return Array.from(bodyParts).sort();
}

/**
 * Filters images by category, style, and/or body part
 */
export function filterTattoos(
  images: TattooImage[],
  selectedCategoryId?: number,
  selectedStyleId?: number,
  selectedBodyPart?: string,
  searchQuery?: string
): TattooImage[] {
  return images.filter((img) => {
    const categoryMatch = !selectedCategoryId || img.category?.id === selectedCategoryId;
    const styleMatch = !selectedStyleId || img.matchedStyle?.id === selectedStyleId;
    const bodyPartMatch = !selectedBodyPart || img.bodyPart === selectedBodyPart;
    
    // Search filter: match against style name, category name, or body part
    let searchMatch = true;
    if (searchQuery && searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase().trim();
      const styleName = img.matchedStyle?.name?.toLowerCase() || img.style?.toLowerCase() || "";
      const categoryName = img.category?.name?.toLowerCase() || "";
      const bodyPartName = img.bodyPart?.toLowerCase() || "";
      
      searchMatch = 
        styleName.includes(query) ||
        categoryName.includes(query) ||
        bodyPartName.includes(query);
    }
    
    return categoryMatch && styleMatch && bodyPartMatch && searchMatch;
  });
}

/**
 * Gets alternative tattoos (same category/style or same body part)
 */
export function getAlternatives(
  images: TattooImage[],
  currentImage: TattooImage,
  limit: number = 6
): TattooImage[] {
  const alternatives = images.filter(
    (img) =>
      img.fileName !== currentImage.fileName &&
      (
        // Same matched style
        (img.matchedStyle?.id === currentImage.matchedStyle?.id) ||
        // Same category
        (img.category?.id === currentImage.category?.id && img.matchedStyle?.id !== currentImage.matchedStyle?.id) ||
        // Same body part
        (img.bodyPart === currentImage.bodyPart)
      )
  );
  
  // Prioritize: same style > same category > same body part
  const sameStyle = alternatives.filter(img => img.matchedStyle?.id === currentImage.matchedStyle?.id);
  const sameCategory = alternatives.filter(
    img => img.category?.id === currentImage.category?.id && 
           img.matchedStyle?.id !== currentImage.matchedStyle?.id
  );
  const sameBodyPart = alternatives.filter(
    img => img.bodyPart === currentImage.bodyPart && 
           img.matchedStyle?.id !== currentImage.matchedStyle?.id &&
           img.category?.id !== currentImage.category?.id
  );
  
  return [...sameStyle, ...sameCategory, ...sameBodyPart].slice(0, limit);
}

/**
 * Fetches generated tattoo images for a specific user
 * @param userId - User ID to fetch images for
 */
export async function getUserGeneratedTattoos(userId: string): Promise<TattooImage[]> {
  try {
    const userPath = `generated/${userId}/`;
    const imagesRef = ref(storage, userPath);
    const result = await listAll(imagesRef);
    
    if (result.items.length === 0) {
      return [];
    }
    
    const imagePromises: Promise<TattooImage | null>[] = result.items.map(async (itemRef) => {
      try {
        const url = await getDownloadURL(itemRef);
        const fileName = itemRef.name;
        
        const image: TattooImage = {
          url,
          style: '', // Generated images don't have style/bodyPart in filename
          bodyPart: '',
          fileName,
        };
        
        return image;
      } catch (error) {
        console.error(`Error processing image ${itemRef.name}:`, error);
        return null;
      }
    });
    
    const images = await Promise.all(imagePromises);
    const validImages = images.filter((img): img is TattooImage => img !== null);
    
    // Sort by timestamp extracted from filename (most recent first)
    // Filename format: {timestamp}-{idx}.png
    validImages.sort((a, b) => {
      const timestampA = parseInt(a.fileName.split('-')[0]) || 0;
      const timestampB = parseInt(b.fileName.split('-')[0]) || 0;
      return timestampB - timestampA; // Descending order (newest first)
    });
    
    return validImages;
  } catch (error: any) {
    if (error?.code === 'storage/object-not-found' || error?.code === 'storage/unauthorized') {
      // User folder doesn't exist yet or no access - return empty array
      return [];
    }
    console.error('Error fetching user generated tattoos:', error);
    return [];
  }
}


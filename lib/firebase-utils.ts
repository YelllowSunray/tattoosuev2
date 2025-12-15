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
}

/**
 * Fetches all tattoo images from Firebase Storage
 * @param folderPath - Optional folder path in Firebase Storage (default: '/')
 * Note: If images are in a subfolder, specify it like 'tattoos/' or 'images/'
 */
export async function getAllTattooImages(folderPath: string = '/'): Promise<TattooImage[]> {
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
          
          const imagePromises = result.items.map(async (itemRef) => {
            try {
              const url = await getDownloadURL(itemRef);
              const fileName = itemRef.name;
              
              // Parse filename: style_bodypart.png
              const [style, bodyPartWithExt] = fileName.split('_');
              const bodyPart = bodyPartWithExt?.replace(/\.(png|jpg|jpeg|webp)$/i, '') || '';
              
              // Match style to category
              const match = matchStyleToCategory(style || '');
              
              return {
                url,
                style: style || '',
                bodyPart,
                fileName,
                category: match?.category,
                matchedStyle: match?.style,
              };
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
  selectedBodyPart?: string
): TattooImage[] {
  return images.filter((img) => {
    const categoryMatch = !selectedCategoryId || img.category?.id === selectedCategoryId;
    const styleMatch = !selectedStyleId || img.matchedStyle?.id === selectedStyleId;
    const bodyPartMatch = !selectedBodyPart || img.bodyPart === selectedBodyPart;
    return categoryMatch && styleMatch && bodyPartMatch;
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


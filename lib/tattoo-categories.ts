export interface TattooCategory {
  id: number;
  name: string;
  styles: TattooStyle[];
}

export interface TattooStyle {
  id: number;
  name: string;
  keywords: string[]; // Keywords to match against filenames
}

export const TATTOO_CATEGORIES: TattooCategory[] = [
  {
    id: 1,
    name: 'Classic & Traditional',
    styles: [
      { id: 1, name: 'American Traditional (Old School)', keywords: ['american', 'old-school', 'oldschool', 'traditional-american'] },
      { id: 2, name: 'Neo-Traditional', keywords: ['neo-traditional', 'neotraditional', 'neo'] },
      { id: 3, name: 'European Traditional', keywords: ['european', 'european-traditional'] },
      { id: 4, name: 'Japanese Irezumi', keywords: ['irezumi', 'japanese-irezumi', 'japanese'] },
      { id: 5, name: 'Horimono (Full Japanese Bodysuit)', keywords: ['horimono', 'bodysuit'] },
      { id: 6, name: 'Black & Grey Traditional', keywords: ['black-grey', 'black-and-grey', 'blackgrey'] },
      { id: 7, name: 'Color Realism Traditional', keywords: ['color-realism-traditional', 'traditional-color-realism', 'colorrealism-traditional'] },
      { id: 8, name: 'Pin-up', keywords: ['pinup', 'pin-up', 'pinup'] },
      { id: 9, name: 'Nautical', keywords: ['nautical', 'sailor', 'maritime'] },
      { id: 10, name: 'Sailor Jerry Style', keywords: ['sailor-jerry', 'sailorjerry'] },
      { id: 11, name: 'Old School Animal', keywords: ['old-school-animal', 'oldschool-animal'] },
      { id: 12, name: 'Old School Floral', keywords: ['old-school-floral', 'oldschool-floral'] },
      { id: 13, name: 'Classic Lettering', keywords: ['classic-lettering', 'classic-letter'] },
      { id: 14, name: 'Religious Traditional', keywords: ['religious', 'religious-traditional'] },
      { id: 15, name: 'Mythology Traditional', keywords: ['mythology', 'mythology-traditional'] },
      { id: 16, name: 'Vintage Illustration', keywords: ['vintage', 'vintage-illustration'] },
      { id: 17, name: 'Horror Traditional', keywords: ['horror', 'horror-traditional'] },
      { id: 18, name: 'Tribal Old School', keywords: ['tribal-old-school', 'tribal-oldschool', 'old-school-tribal'] },
      { id: 19, name: 'Americana', keywords: ['americana'] },
      { id: 20, name: 'Classic Script', keywords: ['classic-script', 'classic-script-lettering'] },
    ],
  },
  {
    id: 2,
    name: 'Realism & Hyperrealism',
    styles: [
      { id: 21, name: 'Realism', keywords: ['realism', 'realistic'] },
      { id: 22, name: 'Black & Grey Realism', keywords: ['black-grey-realism', 'blackgrey-realism'] },
      { id: 23, name: 'Color Realism', keywords: ['color-realism', 'colorrealism', 'color-realistic', 'colored-realism'] },
      { id: 24, name: 'Hyperrealism', keywords: ['hyperrealism', 'hyper-realistic'] },
      { id: 25, name: 'Portrait Realism', keywords: ['portrait', 'portrait-realism'] },
      { id: 26, name: 'Pet Portrait', keywords: ['pet', 'pet-portrait', 'animal-portrait'] },
      { id: 27, name: 'Wildlife Realism', keywords: ['wildlife', 'wildlife-realism'] },
      { id: 28, name: 'Botanical Realism', keywords: ['botanical', 'botanical-realism', 'plant-realism'] },
      { id: 29, name: 'Landscape Realism', keywords: ['landscape', 'landscape-realism'] },
      { id: 30, name: 'Still Life', keywords: ['still-life', 'stilllife'] },
      { id: 31, name: 'Object Realism', keywords: ['object-realism', 'object'] },
      { id: 32, name: 'Human Anatomy Realism', keywords: ['anatomy', 'human-anatomy'] },
      { id: 33, name: 'Marine Life Realism', keywords: ['marine', 'marine-life', 'ocean-life'] },
      { id: 34, name: 'Insect / Entomology Realism', keywords: ['insect', 'entomology', 'bug'] },
      { id: 35, name: 'Surreal Realism', keywords: ['surreal', 'surreal-realism', 'surrealism'] },
    ],
  },
  {
    id: 3,
    name: 'Minimalist & Linework',
    styles: [
      { id: 36, name: 'Minimalist', keywords: ['minimalist', 'minimal'] },
      { id: 37, name: 'Fine Line', keywords: ['fine-line', 'fineline'] },
      { id: 38, name: 'Single Needle', keywords: ['single-needle', 'singleneedle'] },
      { id: 39, name: 'Micro Tattoo', keywords: ['micro', 'micro-tattoo'] },
      { id: 40, name: 'Continuous Line', keywords: ['continuous-line', 'continuousline'] },
      { id: 41, name: 'Minimal Abstract', keywords: ['minimal-abstract', 'abstract-minimal'] },
      { id: 42, name: 'Minimal Geometric', keywords: ['minimal-geometric', 'geometric-minimal', 'minimal-geometry'] },
      { id: 43, name: 'Minimal Portrait', keywords: ['minimal-portrait', 'portrait-minimal'] },
      { id: 44, name: 'Minimal Symbol', keywords: ['minimal-symbol', 'symbol-minimal'] },
      { id: 45, name: 'Outline Only', keywords: ['outline', 'outline-only'] },
      { id: 46, name: 'Thin Line Illustration', keywords: ['thin-line', 'thinline'] },
      { id: 47, name: 'Subtle Shading', keywords: ['subtle-shading', 'subtle'] },
      { id: 48, name: 'Tiny Symbols', keywords: ['tiny', 'tiny-symbols'] },
      { id: 49, name: 'Small Nature Icons', keywords: ['nature-icons', 'nature-icon'] },
      { id: 50, name: 'Delicate Geometry', keywords: ['delicate-geometry', 'delicate-geometric'] },
    ],
  },
  {
    id: 4,
    name: 'Blackwork & Dotwork',
    styles: [
      { id: 51, name: 'Blackwork', keywords: ['blackwork', 'black-work'] },
      { id: 52, name: 'Heavy Blackwork', keywords: ['heavy-blackwork', 'heavy-black'] },
      { id: 53, name: 'Solid Black', keywords: ['solid-black', 'solidblack'] },
      { id: 54, name: 'Dark Ornamental', keywords: ['dark-ornamental', 'ornamental'] },
      { id: 55, name: 'Neo-Blackwork', keywords: ['neo-blackwork', 'neoblackwork'] },
      { id: 56, name: 'Dotwork', keywords: ['dotwork', 'dot-work', 'dots'] },
      { id: 57, name: 'Stippling', keywords: ['stippling', 'stipple'] },
      { id: 58, name: 'Pointillism', keywords: ['pointillism', 'pointillist'] },
      { id: 59, name: 'Cross-Hatching', keywords: ['cross-hatching', 'crosshatching', 'hatching'] },
      { id: 60, name: 'Scratchboard', keywords: ['scratchboard', 'scratch-board'] },
      { id: 61, name: 'Etching Style', keywords: ['etching', 'etch'] },
      { id: 62, name: 'Woodcut Style', keywords: ['woodcut', 'wood-cut'] },
      { id: 63, name: 'Mandala Blackwork', keywords: ['mandala-blackwork', 'mandala-black', 'blackwork-mandala'] },
      { id: 64, name: 'Tribal Blackwork', keywords: ['tribal-blackwork', 'blackwork-tribal'] },
      { id: 65, name: 'Negative Space Blackwork', keywords: ['negative-space', 'negative-space-blackwork'] },
    ],
  },
  {
    id: 5,
    name: 'Geometry & Pattern',
    styles: [
      { id: 66, name: 'Geometric', keywords: ['geometric', 'geometry', 'geometric-pattern', 'geometric-design'] },
      { id: 67, name: 'Sacred Geometry', keywords: ['sacred-geometry', 'sacredgeometry'] },
      { id: 68, name: 'Mandala', keywords: ['mandala'] },
      { id: 69, name: 'Tessellation', keywords: ['tessellation', 'tessellate'] },
      { id: 70, name: 'Symmetry-Based', keywords: ['symmetry', 'symmetrical'] },
      { id: 71, name: 'Asymmetrical Geometry', keywords: ['asymmetrical', 'asymmetry'] },
      { id: 72, name: 'Fractal', keywords: ['fractal'] },
      { id: 73, name: 'Optical Illusion', keywords: ['optical-illusion', 'opticalillusion', 'illusion'] },
      { id: 74, name: 'Low-Poly', keywords: ['low-poly', 'lowpoly', 'poly'] },
      { id: 75, name: 'Wireframe', keywords: ['wireframe', 'wire-frame'] },
    ],
  },
  {
    id: 6,
    name: 'Cultural & Tribal',
    styles: [
      { id: 76, name: 'Polynesian', keywords: ['polynesian'] },
      { id: 77, name: 'Maori Tā Moko', keywords: ['maori', 'tamoko', 'ta-moko'] },
      { id: 78, name: 'Samoan', keywords: ['samoan'] },
      { id: 79, name: 'Hawaiian', keywords: ['hawaiian'] },
      { id: 80, name: 'Filipino Tribal', keywords: ['filipino', 'filipino-tribal'] },
      { id: 81, name: 'Thai Sak Yant', keywords: ['sak-yant', 'sakyant', 'thai'] },
      { id: 82, name: 'Cambodian Yantra', keywords: ['yantra', 'cambodian', 'cambodian-yantra'] },
      { id: 83, name: 'Celtic', keywords: ['celtic'] },
      { id: 84, name: 'Nordic / Viking', keywords: ['nordic', 'viking', 'norse'] },
      { id: 85, name: 'Slavic Pagan', keywords: ['slavic', 'slavic-pagan', 'pagan'] },
    ],
  },
  {
    id: 7,
    name: 'Lettering & Symbolic',
    styles: [
      { id: 86, name: 'Script', keywords: ['script'] },
      { id: 87, name: 'Calligraphy', keywords: ['calligraphy', 'calligraphic'] },
      { id: 88, name: 'Gothic Script', keywords: ['gothic', 'gothic-script'] },
      { id: 89, name: 'Blackletter', keywords: ['blackletter', 'black-letter'] },
      { id: 90, name: 'Roman Capitals', keywords: ['roman', 'roman-capitals'] },
      { id: 91, name: 'Handwritten', keywords: ['handwritten', 'hand-writing'] },
      { id: 92, name: 'Brush Lettering', keywords: ['brush', 'brush-lettering'] },
      { id: 93, name: 'Typewriter Font', keywords: ['typewriter', 'type-writer'] },
      { id: 94, name: 'Sigil / Rune', keywords: ['sigil', 'rune', 'runes'] },
      { id: 95, name: 'Alchemical / Astrological', keywords: ['alchemical', 'astrological', 'alchemical-astrological', 'alchemy', 'astrology'] },
    ],
  },
  {
    id: 8,
    name: 'Modern & Pop Culture',
    styles: [
      { id: 96, name: 'Illustrative', keywords: ['illustrative', 'illustration'] },
      { id: 97, name: 'Sketch Style', keywords: ['sketch', 'sketch-style', 'sketchy'] },
      { id: 98, name: 'Watercolor', keywords: ['watercolor', 'water-colour', 'watercolour'] },
      { id: 99, name: 'Trash Polka', keywords: ['trash-polka', 'trashpolka', 'polka'] },
      { id: 100, name: 'Anime / Manga', keywords: ['anime', 'manga', 'anime-manga'] },
    ],
  },
];

/**
 * Matches a filename style string to a tattoo style
 * Prioritizes more specific/longer keyword matches
 */
export function matchStyleToCategory(styleString: string): { category: TattooCategory; style: TattooStyle } | null {
  const normalized = styleString.toLowerCase().replace(/[_\s-]/g, '-');
  
  // Collect all matches with their specificity score
  const matches: Array<{ category: TattooCategory; style: TattooStyle; score: number }> = [];
  
  for (const category of TATTOO_CATEGORIES) {
    for (const style of category.styles) {
      for (const keyword of style.keywords) {
        const normalizedKeyword = keyword.toLowerCase().replace(/[_\s-]/g, '-');
        
        // Check for matches
        const isExactMatch = normalized === normalizedKeyword;
        const containsKeyword = normalized.includes(normalizedKeyword);
        const keywordContainsNormalized = normalizedKeyword.includes(normalized);
        
        if (isExactMatch || containsKeyword || keywordContainsNormalized) {
          // Score: exact match > longer keyword > shorter keyword
          let score = normalizedKeyword.length;
          if (isExactMatch) score += 1000; // Exact matches get highest priority
          if (containsKeyword && !isExactMatch) score += 100; // Contains gets higher priority than reverse
          
          // Special handling: if keyword contains "traditional", boost score significantly
          // This ensures "color-realism-traditional" beats "color-realism" when both could match
          if (normalizedKeyword.includes('traditional') && normalized.includes('traditional')) {
            score += 500;
          }
          
          matches.push({ category, style, score });
        }
      }
    }
  }
  
  // Return the match with the highest score (most specific)
  if (matches.length > 0) {
    matches.sort((a, b) => b.score - a.score);
    return { category: matches[0].category, style: matches[0].style };
  }
  
  return null;
}

/**
 * Gets all categories
 */
export function getAllCategories(): TattooCategory[] {
  return TATTOO_CATEGORIES;
}

/**
 * Gets category by ID
 */
export function getCategoryById(id: number): TattooCategory | undefined {
  return TATTOO_CATEGORIES.find(cat => cat.id === id);
}

/**
 * Gets style by ID
 */
export function getStyleById(id: number): { category: TattooCategory; style: TattooStyle } | null {
  for (const category of TATTOO_CATEGORIES) {
    const style = category.styles.find(s => s.id === id);
    if (style) {
      return { category, style };
    }
  }
  return null;
}


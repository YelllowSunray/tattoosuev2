import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth, type JWTInput } from "google-auth-library";
import { parseServiceAccountJson } from "@/lib/service-account-parser";
import { requireAuth } from "@/lib/auth-helpers";
import { getUserCredits, deductCredits, CREDIT_COSTS } from "@/lib/credit-utils";

// Use the same model as generate-banana for consistency
const BANANA_VERTEX_MODEL_ID =
  (process.env.BANANA_VERTEX_MODEL_ID || "").trim() || "gemini-2.5-flash-image";

function parseServiceAccount(): JWTInput {
  return parseServiceAccountJson(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
}

async function getAccessToken(): Promise<string> {
  const auth = new GoogleAuth({
    credentials: parseServiceAccount(),
    scopes: [
      "https://www.googleapis.com/auth/cloud-platform",
      "https://www.googleapis.com/auth/generative-language",
    ],
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token =
    typeof tokenResponse === "string" ? tokenResponse : tokenResponse?.token;

  if (!token) {
    throw new Error("Failed to acquire Google access token for Gemini.");
  }
  return token;
}

async function convertToStencil(
  imageData: string,
  mimeType: string = "image/png",
  placementPhoto?: string,
  placementMimeType?: string,
  bodyPart?: string
): Promise<string> {
  const accessToken = await getAccessToken();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${BANANA_VERTEX_MODEL_ID}:generateContent`;

  // Clean the base64 data - remove data URL prefix if present
  let cleanBase64 = imageData.trim();
  if (cleanBase64.includes(",")) {
    cleanBase64 = cleanBase64.split(",")[1];
  }

  // Build parts array - start with placement photo if provided
  const parts: any[] = [];
  
  if (placementPhoto) {
    let cleanPlacementBase64 = placementPhoto.trim();
    if (cleanPlacementBase64.includes(",")) {
      cleanPlacementBase64 = cleanPlacementBase64.split(",")[1];
    }
    
    console.log(`📸 Stencil: Including placement photo for ${bodyPart || "unknown body part"}`);
    parts.push({
      inlineData: {
        data: cleanPlacementBase64,
        mimeType: placementMimeType || "image/png",
      },
    });
  } else {
    console.log(`⚠️  Stencil: No placement photo provided - will infer curvature from tattoo image itself`);
  }

  // Add the tattoo design image (this is always the main/primary image)
  console.log(`🎨 Stencil: Converting tattoo design to stencil (primary input image)`);
  parts.push({
    inlineData: {
      data: cleanBase64,
      mimeType: mimeType,
    },
  });

  // Enhanced stencil conversion prompt with curved surface inference
  let stencilPrompt = ``;
  
  if (placementPhoto && bodyPart) {
    stencilPrompt = `COMPUTER VISION PIPELINE: Multi-step image processing to extract tattoo ink mask, perform 3D surface reconstruction, infer occluded regions, and apply geometric unwrapping to create a flat 2D stencil.

═══════════════════════════════════════════════════════════════
TASK DEFINITION: PIXEL-LEVEL SEMANTIC SEGMENTATION + 3D UNWRAPPING
═══════════════════════════════════════════════════════════════

⚠️ INPUT: You will receive images in this order:

1. FIRST IMAGE (if provided): ${bodyPart} placement photo - OPTIONAL REFERENCE
   - This is an optional reference photo showing the body part shape/curvature
   - Use it ONLY to better understand the 3D geometry and curvature
   - IGNORE the body part pixels in this image - it's just for reference
   - If this image is NOT provided, infer curvature from the tattoo image itself

2. MAIN IMAGE: Tattoo design image - THIS IS THE PRIMARY INPUT
   - This is the REAL tattoo design rendered on a ${bodyPart}
   - This image contains BOTH the tattoo ink design AND the ${bodyPart} outline
   - You must SEPARATE them: extract ONLY the tattoo ink, exclude the ${bodyPart} outline
   - ALL processing must be done using THIS image as the primary source
   - If placement photo is provided, use it only as a reference for curvature understanding

OUTPUT SPECIFICATION (STRICT BINARY MASK):
Your output is a binary segmentation mask with exactly 2 classes:

CLASS 0: BACKGROUND (WHITE PIXELS #FFFFFF)
  → ${bodyPart} outline/contour pixels
  → Finger/hand/arm shape pixels
  → Skin boundary pixels
  → Body anatomy pixels
  → Empty space pixels
  → ANY pixel that is NOT tattoo ink

CLASS 1: FOREGROUND (BLACK PIXELS #000000)
  → ONLY tattoo ink pixels
  → Tattoo design lines
  → Tattoo patterns, symbols, decorations
  → Tattoo artwork elements
  → ZERO body part pixels allowed

CRITICAL CONSTRAINT: The ${bodyPart} outline in the MAIN TATTOO IMAGE is a RENDERING ARTIFACT, not part of the tattoo design. It represents the 3D surface the tattoo is ON, not the tattoo itself. Your output must contain ZERO pixels from the ${bodyPart} outline.

═══════════════════════════════════════════════════════════════
STEP 1: COLOR CONVERSION & SEMANTIC SEGMENTATION
═══════════════════════════════════════════════════════════════

CRITICAL COLOR CONVERSION STEP (MUST BE FIRST):
The input tattoo image may contain COLORS (red, blue, green, yellow, purple, etc.) or GRAYSCALE.
Your output MUST be PURE MONOCHROME: Only BLACK (#000000) and WHITE (#FFFFFF).

COLOR-TO-MONOCHROME CONVERSION RULES:
1. ALL colored tattoo pixels (red, blue, green, yellow, purple, orange, etc.) → Convert to BLACK (#000000)
2. ALL grayscale tattoo pixels (any shade of gray) → Convert to BLACK (#000000)
3. ALL skin/body part pixels → Convert to WHITE (#FFFFFF)
4. ALL background pixels → Convert to WHITE (#FFFFFF)

IMPORTANT: Do NOT preserve color information. Do NOT create grayscale output.
- Red tattoo ink → BLACK
- Blue tattoo ink → BLACK
- Green tattoo ink → BLACK
- Yellow tattoo ink → BLACK
- Purple tattoo ink → BLACK
- ANY color tattoo ink → BLACK
- Grayscale tattoo ink → BLACK
- Skin/body part → WHITE
- Background → WHITE

ALGORITHM: Process the MAIN TATTOO IMAGE using pixel-level semantic segmentation to classify each pixel into one of two classes.

PIXEL CLASSIFICATION LOOP:
FOR EACH PIXEL (x, y) in the MAIN TATTOO IMAGE:
  
  STEP 1A: COLOR CLASSIFICATION
  - Check if pixel is tattoo ink (regardless of color: red, blue, green, yellow, etc.)
  - Check if pixel is body part/skin/background
  
  STEP 1B: MONOCHROME CONVERSION
  - IF pixel is tattoo ink (ANY color or grayscale):
    → Convert to BLACK (#000000) - regardless of original color
    → Label: FOREGROUND
    → Output pixel value: BLACK (#000000)
  - ELSE IF pixel is body part/skin/background:
    → Convert to WHITE (#FFFFFF)
    → Label: BACKGROUND
    → Output pixel value: WHITE (#FFFFFF)
  
  FEATURE EXTRACTION:
  - Extract pixel color/intensity (for classification, not preservation)
  - Extract local texture features (edges, gradients)
  - Extract spatial context (neighboring pixels)
  
  CLASSIFICATION DECISION:
  IF pixel features match TATTOO_INK class (ANY COLOR OR GRAYSCALE):
    → Label: FOREGROUND
    → Output pixel value: BLACK (#000000) ← ALL colors become black
    → Reason: Pixel is part of tattoo design (lines, patterns, symbols) - color is irrelevant
    
  ELSE IF pixel features match BODY_PART class:
    → Label: BACKGROUND
    → Output pixel value: WHITE (#FFFFFF) ← MANDATORY EXCLUSION
    → Reason: Pixel is part of ${bodyPart} outline, finger edge, or body anatomy
    
  ELSE:
    → Label: BACKGROUND
    → Output pixel value: WHITE (#FFFFFF)
    → Reason: Empty space or unknown

SEGMENTATION HEURISTICS:
- Tattoo ink features: Thin lines, patterns, decorative elements, artistic symbols
- Tattoo ink can be ANY COLOR (red, blue, green, yellow, purple, etc.) or grayscale
- ALL tattoo ink colors must be converted to BLACK in the output
- Body part features: Thick contours, skin boundaries, anatomical shapes, finger/hand edges
- Edge detection: Tattoo lines are typically thinner and more intricate than body part outlines
- Color analysis: Tattoo ink (regardless of color) is usually more saturated/darker than skin boundaries

CRITICAL: Use edge detection to distinguish:
- Tattoo lines: Thin, intricate, part of design pattern
- Body part outlines: Thick, smooth, form anatomical shapes

RESULT: Binary mask where mask[x,y] = 1 (black) if pixel is tattoo ink, mask[x,y] = 0 (white) otherwise.

═══════════════════════════════════════════════════════════════
STEP 2: 3D SURFACE RECONSTRUCTION & OCCLUSION INFERENCE
═══════════════════════════════════════════════════════════════

TASK: Reconstruct the 3D surface geometry and infer tattoo design on occluded regions.

CAMERA GEOMETRY ANALYSIS:
- Camera position: Viewing ${bodyPart} from ONE angle (e.g., front view)
- Occluded regions: Back side, left side, right side are NOT visible in the MAIN TATTOO IMAGE
- Surface curvature: 
  * If placement photo provided: Use it as reference to understand 3D shape of ${bodyPart}
  * If NO placement photo: Infer 3D curvature from the ${bodyPart} outline visible in the MAIN TATTOO IMAGE itself

INFERENCE ALGORITHM:
1. SURFACE RECONSTRUCTION:
   - PRIMARY: Analyze the MAIN TATTOO IMAGE to extract ${bodyPart} 3D geometry from the visible outline
   - OPTIONAL: If placement photo provided, use it as additional reference for curvature understanding
   - Build implicit 3D surface model (treat as cylinder/ellipsoid approximation)
   - Map visible tattoo pixels from the MAIN TATTOO IMAGE onto this 3D surface

2. OCCLUSION PREDICTION:
   - Identify visible region: Front-facing surface (what camera sees)
   - Identify occluded regions: Back, left side, right side (NOT visible)
   - For each occluded region, predict tattoo design using:
     * Continuity: Design elements continue logically around curve
     * Symmetry: If design has symmetry, extend to occluded side
     * Pattern completion: Complete patterns that are partially visible
     * Detail preservation: Maintain same line density and detail level

3. VIEW SYNTHESIS:
   - Generate novel views of tattoo on occluded surfaces
   - Combine visible tattoo (from the MAIN TATTOO IMAGE) + inferred tattoo (predicted)
   - Result: Complete 3D tattoo mask covering entire ${bodyPart} surface

CRITICAL: Only infer TATTOO design, NOT body part geometry. The inferred regions contain tattoo ink predictions, not ${bodyPart} outlines.

═══════════════════════════════════════════════════════════════
STEP 3: GEOMETRIC UNWRAPPING (3D → 2D Projection)
═══════════════════════════════════════════════════════════════

TASK: Apply cylindrical/UV unwrapping to flatten 3D curved tattoo surface to 2D plane.

UNWRAPPING ALGORITHM:

INPUT: 
- 3D tattoo mask (from Step 1 + Step 2) mapped onto ${bodyPart} surface
- 3D surface geometry (inferred from MAIN TATTOO IMAGE, optionally enhanced with placement photo if provided)

PROCESS (Cylindrical Unwrapping):
1. SURFACE PARAMETERIZATION:
   - Treat ${bodyPart} as developable surface (cylinder approximation)
   - Define UV coordinates: U = around circumference, V = along length
   - Map each 3D point (x, y, z) on surface → 2D UV coordinates (u, v)

2. UNWRAPPING TRANSFORMATION:
   - For each tattoo pixel at 3D position (x, y, z):
     * Calculate UV coordinates: (u, v) = project_to_uv(x, y, z)
     * Map to 2D output: output[u, v] = tattoo_mask[x, y, z]
   - Apply inverse perspective correction to straighten curved lines
   - Remove distortion caused by 3D curvature

3. PERSPECTIVE CORRECTION:
   - Lines that appear curved in 3D view → straighten to 2D
   - Remove foreshortening effects
   - Preserve relative distances and angles from original design

4. OUTPUT GENERATION:
   - Create 2D image plane
   - Place unwrapped tattoo pixels (black) on white background
   - Result: Flat 2D stencil showing complete tattoo design

CONSTRAINT: Only unwrap TATTOO pixels. The ${bodyPart} geometry is NOT part of the output.
- Input: 3D tattoo mask (black pixels = tattoo ink)
- Output: 2D flat stencil (black pixels = tattoo design, white = background)
- NO ${bodyPart} shape in output - only the unwrapped tattoo design

ALGORITHM PSEUDOCODE (conceptual):
// Step 1 & 2: Segment tattoo and infer unseen areas
// tattoo_3d_mask = segment_and_infer(image2, image1)
// Step 3: Reconstruct 3D surface geometry
// surface_geometry = reconstruct_3d(image1)
// Step 4: Create UV mapping for unwrapping
// uv_map = create_uv_mapping(surface_geometry)
// Step 5: Unwrap 3D tattoo to 2D
// stencil_2d = unwrap_cylinder(tattoo_3d_mask, uv_map)
// Step 6: Output binary mask
// output = binary_mask(stencil_2d)  // Black = tattoo, White = background

RESULT: Flat 2D stencil ready for transfer paper - tattoo design only, no body part geometry.

═══════════════════════════════════════════════════════════════
STEP 4: VALIDATION & QUALITY ASSURANCE
═══════════════════════════════════════════════════════════════

PRE-GENERATION VALIDATION: Before generating output, verify all steps are correct.

VALIDATION CHECKLIST:

1. SEGMENTATION VALIDATION (Pixel-Level Check):
   ✓ All tattoo ink pixels classified as FOREGROUND (black)
   ✓ ALL ${bodyPart} outline pixels classified as BACKGROUND (white) ← CRITICAL
   ✓ ALL finger/hand edge pixels classified as BACKGROUND (white) ← CRITICAL
   ✓ ALL body anatomy pixels classified as BACKGROUND (white) ← CRITICAL
   ✓ NO body part pixels in foreground mask ← MUST BE ZERO

2. INFERENCE VALIDATION:
   ✓ Unseen regions have inferred tattoo design
   ✓ Inferred regions contain ONLY tattoo pixels (no body part geometry)
   ✓ Design continuity maintained around curve
   ✓ Detail level consistent between visible and inferred regions

3. UNWRAPPING VALIDATION:
   ✓ 3D → 2D transformation applied correctly
   ✓ Curved lines straightened (perspective removed)
   ✓ Complete tattoo design visible (visible + inferred regions)
   ✓ NO ${bodyPart} geometry in unwrapped output ← CRITICAL

4. OUTPUT FORMAT VALIDATION:
   ✓ Binary mask (strictly black/white, no grayscale, NO COLORS)
   ✓ ALL colored tattoo pixels converted to BLACK (#000000)
   ✓ ALL grayscale tattoo pixels converted to BLACK (#000000)
   ✓ NO color preservation - pure monochrome output
   ✓ Black pixels = tattoo design ONLY (regardless of original color)
   ✓ White pixels = background ONLY
   ✓ NO ${bodyPart} outline in output ← MUST BE TRUE
   ✓ NO finger shapes in output ← MUST BE TRUE
   ✓ NO body anatomy in output ← MUST BE TRUE
   ✓ Flat 2D projection (no 3D perspective)
   ✓ PURE MONOCHROME: Only #000000 (black) and #FFFFFF (white) allowed

5. ALGORITHM CORRECTNESS:
   ✓ Segmentation explicitly excludes body part mask
   ✓ Only tattoo mask is preserved through all steps
   ✓ Unwrapping applied to tattoo mask only (not body part)
   ✓ Final output contains ZERO body part pixels

VALIDATION RULE: 
IF any body part pixels detected in output → REJECT and regenerate
IF validation fails → DO NOT generate. Fix segmentation first.
ONLY proceed if output will be: Tattoo design (black) on white background (white) - NOTHING ELSE.

═══════════════════════════════════════════════════════════════
DETAILED REQUIREMENTS
═══════════════════════════════════════════════════════════════

1. PRESERVE ALL TATTOO DESIGN DETAILS (Detail Preservation):
   - Keep ALL tattoo lines, patterns, textures, and design elements
   - Maintain ALL intricate details, decorations, and fine lines from the tattoo
   - Preserve ALL shapes, symbols, and artistic elements that are part of the tattoo
   - Do NOT simplify or remove tattoo details
   - Convert shading to line work or patterns - do NOT remove it
   - Every tattoo line, dot, pattern must be present in output
   - Detail density in inferred regions must match visible regions

2. EXCLUDE ALL BODY PART PIXELS (Mandatory Exclusion):
   This is the MOST CRITICAL requirement. Use edge detection and feature analysis:
   
   EDGE DETECTION APPROACH:
   - Detect all edges in the MAIN TATTOO IMAGE
   - Classify edges as: TATTOO_EDGE (thin, intricate, part of design) vs. BODY_EDGE (thick, smooth, anatomical)
   - TATTOO_EDGE → Keep (black pixels)
   - BODY_EDGE → Remove (white pixels)
   
   FEATURE ANALYSIS:
   - Tattoo features: Thin lines, patterns, decorative elements, artistic symbols
   - Body part features: Thick contours, smooth curves forming ${bodyPart} shape, finger edges
   - Use morphological operations to separate tattoo ink from body part boundaries
   
   CLASSIFICATION RULES:
   - If pixel/edge is part of ${bodyPart} boundary → WHITE (background) ← MANDATORY
   - If pixel/edge is part of finger/hand shape → WHITE (background) ← MANDATORY
   - If pixel/edge is part of body anatomy → WHITE (background) ← MANDATORY
   - If pixel/edge is part of tattoo design → BLACK (foreground)
   - This is binary classification: tattoo (keep) vs. body part (remove)
   
   ALGORITHM: Use connected component analysis to identify and exclude body part contours.

3. INFER UNSEEN AREAS (Occlusion Completion):
   - Camera shows only ONE side (e.g., front of hand, but not back/sides)
   - Use 3D surface reconstruction to understand curvature
   - Predict what tattoo looks like on: back, left side, right side
   - Extend design elements logically around the curve using:
     * Continuity constraints (design flows smoothly around curve)
     * Pattern completion (complete partially visible patterns)
     * Symmetry (if applicable)
   - Maintain same detail density in inferred areas
   - Infer curvature from the MAIN TATTOO IMAGE (from the visible ${bodyPart} outline)
   - If placement photo provided: Use it as additional reference for curvature (but ignore body part pixels in it)

4. UNWRAP TO FLAT 2D (Geometric Transformation):
   - Apply cylindrical unwrapping: 3D curved surface → 2D flat plane
   - Remove all 3D perspective and curvature distortion
   - Straighten lines that were curved around the ${bodyPart}
   - Flatten to pure 2D - like a sticker peeled off and laid flat
   - Complete unwrapped design showing visible + inferred areas
   - Preserve relative distances and angles from original design

═══════════════════════════════════════════════════════════════
STENCIL FORMAT SPECIFICATION
═══════════════════════════════════════════════════════════════

OUTPUT IMAGE REQUIREMENTS (STRICT MONOCHROME):
- Pure black and white ONLY (no colors, no grayscale, no shades)
- ALL colored tattoo pixels (red, blue, green, yellow, purple, etc.) → BLACK (#000000)
- ALL grayscale tattoo pixels → BLACK (#000000)
- Bold black lines on white background
- High contrast, clean edges
- Professional tattoo stencil quality
- Ready for transfer paper
- Binary mask format: pixel values are either 0 (white) or 255 (black)
- NO color preservation - convert ALL colors to black

FINAL REMINDER - BODY PART EXCLUSION:
The ${bodyPart} outline you see in the MAIN TATTOO IMAGE is a RENDERING ARTIFACT representing the 3D surface.
It is NOT part of the tattoo design. It is the CANVAS, not the ARTWORK.
Your output must contain ZERO pixels from this outline.
`;
  } else {
    // No placement photo - work with single image only
    const bodyPartText = bodyPart ? ` on a ${bodyPart}` : '';
    stencilPrompt = `COMPUTER VISION PIPELINE: Extract tattoo ink mask from the input image${bodyPartText}, infer occluded regions, and unwrap to flat 2D stencil.

═══════════════════════════════════════════════════════════════
TASK: SEMANTIC SEGMENTATION + 3D UNWRAPPING (SINGLE IMAGE)
═══════════════════════════════════════════════════════════════

INPUT: You will receive ONE image - the tattoo design image${bodyPartText ? ` showing a tattoo on a ${bodyPart}` : ''}.

This image contains:
- The tattoo ink design (what you want to extract)
- The ${bodyPart ? `${bodyPart} outline` : 'body part outline'} (what you must exclude)
- Possibly curved/perspective distortion (what you must unwrap)

ALL PROCESSING MUST BE DONE USING THIS SINGLE IMAGE.

STEP 1: COLOR CONVERSION & SEMANTIC SEGMENTATION

CRITICAL COLOR CONVERSION (MUST BE FIRST):
The input tattoo may contain COLORS (red, blue, green, yellow, purple, etc.) or GRAYSCALE.
Your output MUST be PURE MONOCHROME: Only BLACK (#000000) and WHITE (#FFFFFF).

COLOR-TO-MONOCHROME CONVERSION:
- ALL colored tattoo pixels (red, blue, green, yellow, purple, orange, etc.) → Convert to BLACK (#000000)
- ALL grayscale tattoo pixels (any shade of gray) → Convert to BLACK (#000000)
- ALL skin/body part pixels → Convert to WHITE (#FFFFFF)
- ALL background pixels → Convert to WHITE (#FFFFFF)

IMPORTANT: Do NOT preserve color information. Do NOT create grayscale output.
- Red tattoo ink → BLACK
- Blue tattoo ink → BLACK
- Green tattoo ink → BLACK
- Yellow tattoo ink → BLACK
- Purple tattoo ink → BLACK
- ANY color tattoo ink → BLACK
- Grayscale tattoo ink → BLACK
- Skin/body part → WHITE
- Background → WHITE

SEMANTIC SEGMENTATION:
- Classify each pixel: TATTOO_INK (keep, convert to black) vs. BODY_PART/BACKGROUND (exclude, white)
- Use edge detection: Tattoo lines are thin/intricate, body part outlines are thick/smooth
- Extract ONLY tattoo ink pixels (regardless of color), exclude ALL body part outline pixels
- Convert ALL tattoo ink colors to BLACK - color is irrelevant for stencils

STEP 2: INFER UNSEEN AREAS (if ${bodyPart ? `tattoo is on curved ${bodyPart}` : 'tattoo is on curved surface'})
- Analyze the visible ${bodyPart ? `${bodyPart} outline` : 'body part outline'} in the image to understand curvature
- Infer what the tattoo looks like on occluded regions (back, sides)
- Extend design elements logically around the curve

STEP 3: GEOMETRIC UNWRAPPING
- Unwrap the curved 3D surface to flat 2D
- Straighten curved lines (remove perspective distortion)
- Flatten to pure 2D stencil format

CRITICAL REQUIREMENTS:
- Preserve ALL tattoo details (lines, patterns, symbols, decorations)
- Convert ALL colored tattoo pixels to BLACK (red, blue, green, yellow, purple, etc. → all become black)
- Convert ALL grayscale tattoo pixels to BLACK
- Exclude ALL body part outline pixels (ZERO body part geometry in output)
- Output: Pure monochrome binary mask (black = tattoo ink regardless of original color, white = background)
- NO color preservation - pure black and white ONLY
- Flat 2D projection ready for transfer paper`;
  }
  
  if (placementPhoto && bodyPart) {
    stencilPrompt += `\n\n═══════════════════════════════════════════════════════════════
🎯 FINAL OUTPUT GENERATION - STRICT SPECIFICATION
═══════════════════════════════════════════════════════════════

YOUR OUTPUT IMAGE MUST BE:

1. TATTOO DESIGN ONLY:
   - ONLY tattoo design lines (wolf, mandala, patterns, symbols, artwork)
   - ALL tattoo details preserved (lines, patterns, symbols, decorations)
   - Complete design including inferred unseen areas
   - NO EXCEPTIONS - tattoo design is the ONLY content

2. ZERO BODY PART GEOMETRY:
   - ZERO ${bodyPart} outline pixels - ABSOLUTELY FORBIDDEN
   - ZERO hand/arm/finger shape pixels - ABSOLUTELY FORBIDDEN
   - ZERO body anatomy pixels - ABSOLUTELY FORBIDDEN
   - ZERO skin boundary pixels - ABSOLUTELY FORBIDDEN
   - The ${bodyPart} outline is a RENDERING ARTIFACT, not part of the tattoo

3. FLAT 2D PROJECTION:
   - Completely flat 2D (unwrapped from curved 3D surface)
   - Like a sticker peeled off and laid flat on paper
   - All perspective distortion removed
   - Curved lines straightened to 2D

4. BINARY MASK FORMAT (STRICT MONOCHROME):
   - Pure black and white ONLY (no colors, no grayscale, no shades)
   - ALL colored tattoo pixels (red, blue, green, yellow, purple, etc.) → BLACK (#000000)
   - ALL grayscale tattoo pixels → BLACK (#000000)
   - Black pixels = tattoo ink ONLY (regardless of original color)
   - White pixels = background ONLY
   - High contrast, clean edges
   - NO color preservation - convert ALL colors to black
   - Output must be PURE MONOCHROME: Only #000000 and #FFFFFF
   - Professional tattoo stencil quality

OUTPUT VALIDATION (CHECK BEFORE GENERATING):

VALID OUTPUT (MUST MATCH ALL OF THESE):
✓ Black pixels: Tattoo design lines ONLY (artwork, patterns, symbols)
✓ White pixels: Background ONLY (empty space)
✓ NO ${bodyPart} outline - COUNT MUST BE ZERO
✓ NO finger/hand shapes - COUNT MUST BE ZERO
✓ NO body anatomy - COUNT MUST BE ZERO
✓ NO gray pixels - COUNT MUST BE ZERO
✓ Flat 2D projection (no 3D perspective)
✓ Includes inferred unseen areas (but still NO body parts)

INVALID OUTPUT (REJECT IF ANY OF THESE):
✗ Contains ${bodyPart} outline → REJECT AND REGENERATE
✗ Contains finger/hand shapes → REJECT AND REGENERATE
✗ Contains body anatomy → REJECT AND REGENERATE
✗ Contains any body part pixels → REJECT AND REGENERATE
✗ Contains grayscale pixels → REJECT AND REGENERATE

🚫🚫🚫 CRITICAL FINAL REMINDER 🚫🚫🚫

The ${bodyPart} outline in the MAIN TATTOO IMAGE is NOT tattoo ink.
It is the 3D SURFACE the tattoo is rendered ON.
It is the CANVAS, not the ARTWORK.
It is a RENDERING ARTIFACT, not part of the design.

ALL PROCESSING MUST BE DONE USING THE MAIN TATTOO IMAGE.
The placement photo (if provided) is ONLY a reference for curvature understanding.

Your output = Tattoo design ONLY, floating on white background.
Your output = Binary mask where mask[tattoo_pixels] = 1 (black), mask[everything_else] = 0 (white).

This is computer vision semantic segmentation: extract tattoo mask, explicitly exclude body part mask.

GENERATE NOW: A flat 2D stencil showing the complete tattoo design with ALL details, ZERO body part geometry.`;
  } else {
    stencilPrompt += `\n\nOUTPUT: Generate a single 2D flat stencil image that shows the complete tattoo design with ALL details preserved.`;
  }

  parts.push({
    text: stencilPrompt,
  });

  console.log(`📝 Stencil prompt (first 300 chars): ${stencilPrompt.substring(0, 300)}...`);

  const body = {
    contents: [
      {
        role: "user",
        parts: parts,
      },
    ],
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
    generationConfig: {
      temperature: 0.2, // Low but not zero - balance between consistency and flexibility
      topP: 0.95, // Nucleus sampling for focused generation
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(
      `Stencil conversion failed: ${res.status} ${res.statusText} – ${errorText}`
    );
  }

  const data = await res.json();
  const candidates = Array.isArray(data?.candidates) ? data.candidates : [];

  for (const c of candidates) {
    const parts = c?.content?.parts || [];
    for (const p of parts) {
      if (p?.inlineData?.data) {
        const mime = p.inlineData.mimeType || "image/png";
        return `data:${mime};base64,${p.inlineData.data}`;
      }
    }
  }

  throw new Error("Stencil conversion did not return any image data.");
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication and credits BEFORE generating
    const userId = await requireAuth(req);
    
    const { images, placementPhoto, placementMimeType, bodyPart } = await req.json();

    if (!Array.isArray(images) || images.length === 0) {
      return NextResponse.json(
        { error: "Images array is required" },
        { status: 400 }
      );
    }

    // Calculate required credits (1 credit per image)
    const numImages = images.length;
    const requiredCredits = numImages * CREDIT_COSTS.GENERATE_STENCIL;
    
    console.log(`💰 Stencil credit calculation: ${numImages} images × ${CREDIT_COSTS.GENERATE_STENCIL} credit = ${requiredCredits} credits required`);
    
    // Check if user has enough credits
    const userCredits = await getUserCredits(userId);
    
    if (userCredits < requiredCredits) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          requiredCredits,
          currentCredits: userCredits,
        },
        { status: 402 } // 402 Payment Required
      );
    }

    // Validate placement photo if provided
    let validPlacementPhoto: string | undefined;
    let validPlacementMimeType: string | undefined;
    
    if (placementPhoto) {
      if (typeof placementPhoto === "string" && placementPhoto.startsWith("data:")) {
        validPlacementPhoto = placementPhoto;
        validPlacementMimeType = placementMimeType || placementPhoto.match(/data:([^;]+);/)?.[1] || "image/png";
      } else {
        console.warn("Invalid placement photo format, proceeding without it");
      }
    }

    // Process ALL images in order, maintaining index correspondence
    // Return null for invalid images to preserve array indices
    const stencilPromises = images.map(async (img, originalIdx) => {
      // Validate image format
      if (!img || typeof img !== "string" || !img.startsWith("data:")) {
        console.warn(`Skipping invalid image at index ${originalIdx}`);
        return { index: originalIdx, stencil: null };
      }

      // Extract mime type from data URL
      const mimeMatch = img.match(/data:([^;]+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
      
      try {
        const stencil = await convertToStencil(
          img, 
          mimeType, 
          validPlacementPhoto, 
          validPlacementMimeType,
          bodyPart
        );
        return { index: originalIdx, stencil: stencil };
      } catch (err) {
        console.error(`Failed to convert image ${originalIdx} to stencil:`, err);
        return { index: originalIdx, stencil: null };
      }
    });

    const results = await Promise.all(stencilPromises);
    
    // Reconstruct stencils array in original order, with nulls for failed/invalid images
    const stencils = new Array(images.length).fill(null);
    results.forEach((result) => {
      stencils[result.index] = result.stencil;
      if (result.stencil) {
        console.log(`✅ API: stencils[${result.index}] generated for images[${result.index}]`);
      } else {
        console.log(`⏭️  API: stencils[${result.index}] = null (failed/invalid)`);
      }
    });

    // Check if we have any valid stencils
    const validStencils = stencils.filter(s => s !== null);
    if (validStencils.length === 0) {
      return NextResponse.json(
        { error: "No valid stencils generated" },
        { status: 400 }
      );
    }

    // Deduct credits BEFORE returning (only for successfully generated stencils)
    // Note: We deduct for all images sent, not just successful ones, to prevent gaming the system
    const deductResult = await deductCredits(userId, requiredCredits, "generate_stencil");
    if (!deductResult.success) {
      // If credit deduction fails, we still return the stencils but log the error
      console.error("Failed to deduct credits for stencil generation:", deductResult.error);
      // Don't fail the request - stencils are already generated
    }

    console.log(`📋 API: Returning stencils array (length=${stencils.length}) with ${validStencils.length} valid stencils`);
    return NextResponse.json({
      stencils, // Return full array with nulls to maintain index correspondence
      count: validStencils.length,
      creditsRemaining: deductResult.remainingCredits,
    });
  } catch (err: any) {
    console.error("Error in /api/generate-stencil:", err);
    return NextResponse.json(
      {
        error:
          err?.message || "Failed to convert images to stencils.",
      },
      { status: 500 }
    );
  }
}

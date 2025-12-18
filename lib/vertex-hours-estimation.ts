import { GoogleAuth, type JWTInput } from 'google-auth-library';

const VERTEX_LOCATION = process.env.VERTEX_LOCATION || process.env.VERTEX_AI_LOCATION || 'us-central1';

export interface HoursEstimationResult {
  success: boolean;
  estimatedHours?: number;
  error?: string;
  tattooId?: string;
}

function parseServiceAccount(): JWTInput | null {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      return JSON.parse(json) as JWTInput;
    } catch (error) {
      console.error('❌ Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', error);
    }
  }
  
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialsPath) {
    try {
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.resolve(process.cwd(), credentialsPath);
      const fileContent = fs.readFileSync(fullPath, 'utf8');
      return JSON.parse(fileContent) as JWTInput;
    } catch (error) {
      console.error('❌ Failed to read credentials file:', error);
    }
  }
  
  return null;
}

function getProjectId(): string | null {
  const parsed = parseServiceAccount();
  const projectId =
    (parsed as { project_id?: string })?.project_id ||
    process.env.VERTEX_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT;

  return projectId || null;
}

async function getAccessToken(): Promise<string> {
  const credentials = parseServiceAccount();
  
  if (!credentials) {
    throw new Error('No service account credentials found. Set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS');
  }

  const auth = new GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token;

  if (!token) {
    throw new Error('Failed to acquire Google access token.');
  }
  return token;
}

/**
 * Estimates the duration (hours) required to complete a tattoo design using Gemini API
 * @param imageDataUrl Base64 data URL or Firebase Storage URL of the tattoo image
 * @returns Estimated duration in hours
 */
export async function estimateHoursForImage(imageDataUrl: string): Promise<number> {
  // Use the shared Gemini estimation logic directly
  const { estimateWithGemini } = await import('@/lib/gemini-estimation');
  
  const prompt = `Analyze this tattoo image and provide a single estimated duration in hours for completing this tattoo by a professional tattoo artist.

Consider these factors:
- Size and complexity of the tattoo
- Amount of detail and shading required
- Color vs black and white (color takes longer)
- Style complexity (realism takes longer than simple line work)
- Fine line work vs bold lines

IMPORTANT: Respond with ONLY a single number representing the estimated duration in hours. Decimals are allowed (e.g., 2.5, 3.5). Do not include any text, explanation, or "hours" suffix. Just the number.

Example format: 2.5

If you cannot determine a duration, respond with: 0`;

  try {
    const result = await estimateWithGemini({
      imageUrl: imageDataUrl.startsWith('http://') || imageDataUrl.startsWith('https://') 
        ? imageDataUrl 
        : undefined,
      imageBase64: imageDataUrl.startsWith('http://') || imageDataUrl.startsWith('https://')
        ? undefined
        : imageDataUrl,
      prompt,
    });

    // Extract the hours number from the response (supports decimals)
    const hoursMatch = result.rawResponse.match(/(\d+(?:\.\d+)?)/);
    
    if (!hoursMatch) {
      throw new Error(`Could not extract hours from Gemini response: ${result.rawResponse}`);
    }

    const estimatedHours = parseFloat(hoursMatch[1]);

    if (isNaN(estimatedHours) || estimatedHours < 0) {
      throw new Error(`Invalid hours returned from Gemini: ${result.rawResponse}`);
    }

    return Math.round(estimatedHours * 10) / 10; // Round to 1 decimal place
  } catch (error) {
    console.error('Error estimating hours:', error);
    throw error;
  }
}

/**
 * Legacy function - kept for backward compatibility but now uses API route
 * @deprecated Use estimateHoursForImage directly
 */
export async function estimateHoursForImageLegacy(imageDataUrl: string): Promise<number> {
  // This function is now deprecated - the new implementation uses the API route
  // Keeping this for reference but it won't be called
  throw new Error('Legacy function should not be called. Use estimateHoursForImage instead.');
}


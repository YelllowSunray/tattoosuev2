/**
 * Shared Gemini API estimation logic
 * Used by both API routes and direct function calls
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Use only Gemini 2.5 Flash
const MODEL_NAME = 'gemini-2.5-flash';

export interface EstimationOptions {
  imageUrl?: string;
  imageBase64?: string;
  prompt: string;
}

export async function estimateWithGemini(options: EstimationOptions): Promise<{ result: number; model: string; rawResponse: string }> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY in your .env.local file. Get your API key from: https://aistudio.google.com/app/apikey');
  }
  
  if (GEMINI_API_KEY.trim().length === 0) {
    throw new Error('GEMINI_API_KEY is set but empty. Please provide a valid Gemini API key in your .env.local file.');
  }

  const { imageUrl, imageBase64, prompt } = options;

  if (!imageUrl && !imageBase64) {
    throw new Error('Either imageUrl or imageBase64 is required');
  }

  let imageData: string;
  let mimeType: string = 'image/jpeg';

  // If imageBase64 is provided, use it directly
  if (imageBase64) {
    // Remove data URL prefix if present
    imageData = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    // Try to extract mime type from data URL
    const mimeMatch = imageBase64.match(/^data:image\/([a-z]+);base64,/);
    if (mimeMatch) {
      mimeType = `image/${mimeMatch[1]}`;
    }
  } else if (imageUrl) {
    // Fetch the image from the URL
    try {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image from URL: ${imageResponse.statusText}`);
      }
      
      const imageBuffer = await imageResponse.arrayBuffer();
      imageData = Buffer.from(imageBuffer).toString('base64');
      
      // Try to determine mime type from response headers
      const contentType = imageResponse.headers.get('content-type');
      if (contentType && contentType.startsWith('image/')) {
        mimeType = contentType;
      }
    } catch (fetchError: any) {
      throw new Error(`Failed to fetch image: ${fetchError.message}`);
    }
  } else {
    throw new Error('No image provided');
  }

  // Use only Gemini 2.5 Flash
  console.log(`Using model: ${MODEL_NAME}`);
  
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

  const requestBody = {
    contents: [{
      parts: [
        {
          inlineData: {
            data: imageData,
            mimeType: mimeType,
          },
        },
        {
          text: prompt,
        },
      ],
    }],
    generationConfig: {
      temperature: 0.7,
    },
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Model ${MODEL_NAME} failed:`, errorText);
    
    if (response.status === 401) {
      throw new Error(`Gemini API key is invalid or missing. Please check your GEMINI_API_KEY environment variable. Error: ${errorText.substring(0, 200)}`);
    }
    
    if (response.status === 404 || response.status === 400) {
      throw new Error(`Model ${MODEL_NAME} is not available or you don't have access to it. Error: ${errorText.substring(0, 200)}`);
    }
    
    throw new Error(`API request failed: ${response.statusText} - ${errorText.substring(0, 200)}`);
  }

  const data = await response.json();

  // Extract text from response
  if (data.candidates && data.candidates.length > 0) {
    const candidate = data.candidates[0];
    
    if (candidate.content && candidate.content.parts) {
      const textPart = candidate.content.parts.find((part: any) => part.text);
      if (textPart) {
        const text = textPart.text.trim();
        // Extract number from response
        const numberMatch = text.match(/(\d+(?:\.\d+)?)/);
        const result = numberMatch ? parseFloat(numberMatch[1] || numberMatch[0]) : 0;
        
        return {
          result: result,
          model: MODEL_NAME,
          rawResponse: text,
        };
      }
    }
  }

  throw new Error(`No text data found in response from ${MODEL_NAME}`);
}


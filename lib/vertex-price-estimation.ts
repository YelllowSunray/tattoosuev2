import { GoogleAuth, type JWTInput } from 'google-auth-library';

const VERTEX_LOCATION = process.env.VERTEX_LOCATION || process.env.VERTEX_AI_LOCATION || 'us-central1';

export interface PriceEstimationResult {
  success: boolean;
  estimatedPrice?: number;
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
 * Estimates the price of a tattoo design using Gemini API
 * @param imageDataUrl Base64 data URL or Firebase Storage URL of the tattoo image
 * @returns Estimated price in euros
 */
export async function estimatePriceForImage(imageDataUrl: string): Promise<number> {
  // Use the shared Gemini estimation logic directly
  const { estimateWithGemini } = await import('@/lib/gemini-estimation');
  
  const prompt = `Analyze this tattoo image and provide a single estimated price in euros (EUR) for getting this tattoo done by a professional tattoo artist in the Netherlands.

Consider these factors:
- Size and complexity of the tattoo
- Amount of detail and shading
- Color vs black and white
- Estimated time to complete
- Typical pricing in the Netherlands (€80-150/hour is common)

IMPORTANT: Respond with ONLY a single number representing the estimated price in euros. Do not include any text, explanation, range, or currency symbol. Just the number.

Example format: 350

If you cannot determine a price, respond with: 0`;

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

    // Extract the price number from the response
    const priceMatch = result.rawResponse.match(/(\d+(?:\.\d+)?)/);
    
    if (!priceMatch) {
      throw new Error(`Could not extract price from Gemini response: ${result.rawResponse}`);
    }

    const estimatedPrice = parseFloat(priceMatch[1]);

    if (isNaN(estimatedPrice) || estimatedPrice < 0) {
      throw new Error(`Invalid price returned from Gemini: ${result.rawResponse}`);
    }

    return Math.round(estimatedPrice);
  } catch (error) {
    console.error('Error estimating price:', error);
    throw error;
  }
}

/**
 * Legacy function - kept for backward compatibility but now uses API route
 * @deprecated Use estimatePriceForImage directly
 */
export async function estimatePriceForImageLegacy(imageDataUrl: string): Promise<number> {
  const projectId = getProjectId();
  if (!projectId) {
    throw new Error('Missing project ID. Set VERTEX_PROJECT_ID or GOOGLE_CLOUD_PROJECT');
  }

  const accessToken = await getAccessToken();
  
  let base64Data: string;
  
  // Check if it's a URL (Firebase Storage) or base64 data URL
  if (imageDataUrl.startsWith('http://') || imageDataUrl.startsWith('https://')) {
    // It's a URL - fetch the image and convert to base64
    console.log('📥 Fetching image from URL for estimation:', imageDataUrl.substring(0, 100));
    try {
      const imageResponse = await fetch(imageDataUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
      }
      const arrayBuffer = await imageResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      base64Data = buffer.toString('base64');
      console.log('✅ Image fetched and converted to base64, length:', base64Data.length);
    } catch (error: any) {
      throw new Error(`Failed to fetch image from URL: ${error.message}`);
    }
  } else {
    // It's a base64 data URL - extract the base64 part
    base64Data = imageDataUrl.includes(',') 
      ? imageDataUrl.split(',')[1] 
      : imageDataUrl;
    
    console.log('📸 Using base64 data, length:', base64Data.length);
  }

  // Use Vertex AI model for estimation
  // Available Vertex AI models: gemini-2.5-flash, gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash-exp
  // Using gemini-2.5-flash as default
  const modelName = process.env.VERTEX_ESTIMATION_MODEL || process.env.ESTIMATION_MODEL || 'gemini-2.5-flash';
  const apiEndpoint = `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${VERTEX_LOCATION}/publishers/google/models/${modelName}:generateContent`;
  
  console.log('🌐 Vertex AI API endpoint:', apiEndpoint);
  console.log('🤖 Using Vertex AI model:', modelName);

  const prompt = `You are a professional tattoo pricing expert. Analyze this tattoo design image and estimate the price in euros that a professional tattoo artist would charge.

Consider:
- Size and complexity of the design
- Detail level and intricacy
- Color vs black and grey (color costs more)
- Style (traditional, realism, watercolor, geometric, etc.)
- Placement difficulty
- Time required (roughly 1 hour = €80-150 depending on complexity)

CRITICAL: You must respond with ONLY a single number. No text, no explanation, no currency symbols, no words. Just the number.

Examples of correct responses:
250
450
1200
350

Do NOT respond with:
"€250" (wrong - has currency symbol)
"250 euros" (wrong - has text)
"About 250" (wrong - has text)
"The price is 250" (wrong - has text)

Respond with ONLY the number:`;

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            {
              text: prompt
            },
            {
              inline_data: {
                mime_type: 'image/png',
                data: base64Data
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 50,
          topP: 0.8,
          topK: 40,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_NONE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_NONE',
          },
        ]
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Price estimation API error response:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText.substring(0, 500),
      });
      
      // If model not found, provide helpful error message
      if (response.status === 404 && errorText.includes('was not found')) {
        throw new Error(`Model ${modelName} not available in your Vertex AI project. Try setting VERTEX_ESTIMATION_MODEL=gemini-2.5-flash or enable the model in Vertex AI.`);
      }
      
      throw new Error(`Price estimation API error: ${response.status} - ${errorText.substring(0, 200)}`);
    }

    const data = await response.json();
    
    console.log('📥 Price estimation API response:', {
      hasCandidates: !!data.candidates,
      candidatesLength: data.candidates?.length || 0,
    });
  
    if (!data.candidates || data.candidates.length === 0) {
      console.error('❌ No candidates in response:', JSON.stringify(data, null, 2).substring(0, 1000));
      throw new Error('No response from price estimation API');
    }

    const candidate = data.candidates[0];
    
    // Check for safety blocks or other issues
    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
      console.error('❌ Candidate finish reason:', candidate.finishReason);
      throw new Error(`Price estimation blocked: ${candidate.finishReason}`);
    }

    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      console.error('❌ No content in candidate:', JSON.stringify(candidate, null, 2).substring(0, 1000));
      throw new Error('No content in price estimation response');
    }

    // Get text from all parts (in case there are multiple)
    let text = '';
    for (const part of candidate.content.parts) {
      if (part.text) {
        text += part.text + ' ';
      }
    }
    text = text.trim();
    
    console.log('📝 Price estimation response text:', text.substring(0, 200));
    
    if (!text) {
      console.error('❌ No text in response parts:', candidate.content.parts);
      throw new Error('No text found in price estimation response');
    }
    
    // Extract number from response - try multiple patterns
    // First try: just numbers (e.g., "250", "1200")
    let priceMatch = text.match(/\b\d+\b/);
    
    // If that fails, try with currency symbols or words
    if (!priceMatch) {
      priceMatch = text.match(/€?\s*(\d+)/i) || text.match(/(\d+)\s*euro/i);
    }
    
    // If still no match, try any number
    if (!priceMatch) {
      priceMatch = text.match(/(\d+)/);
    }
    
    if (!priceMatch) {
      console.error('❌ Could not extract price from text:', text);
      throw new Error(`Could not extract price from response: ${text.substring(0, 200)}`);
    }

    const price = parseFloat(priceMatch[1] || priceMatch[0]);
    if (isNaN(price) || price <= 0) {
      console.error('❌ Invalid price extracted:', priceMatch[0], 'from text:', text);
      throw new Error(`Invalid price extracted: ${priceMatch[0]}`);
    }

    console.log('✅ Extracted price:', price, 'from text:', text);
    return Math.round(price);
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Price estimation timed out after 30 seconds');
    }
    throw error;
  }
}


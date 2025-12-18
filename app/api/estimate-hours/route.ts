import { NextRequest, NextResponse } from 'next/server';
import { estimateWithGemini } from '@/lib/gemini-estimation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, imageBase64 } = body;

    // Create the prompt asking for duration estimate
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
        imageUrl,
        imageBase64,
        prompt,
      });

      // Extract the hours number from the response (supports decimals)
      const hoursMatch = result.rawResponse.match(/(\d+(?:\.\d+)?)/);
      
      if (!hoursMatch) {
        return NextResponse.json(
          { error: 'Could not extract hours from Gemini response', response: result.rawResponse },
          { status: 500 }
        );
      }

      const estimatedHours = parseFloat(hoursMatch[1]);

      if (isNaN(estimatedHours) || estimatedHours < 0) {
        return NextResponse.json(
          { error: 'Invalid hours returned from Gemini', response: result.rawResponse },
          { status: 500 }
        );
      }

      return NextResponse.json({
        estimatedHours: Math.round(estimatedHours * 10) / 10, // Round to 1 decimal
        rawResponse: result.rawResponse,
        model: result.model,
      });
    } catch (error: any) {
      return NextResponse.json(
        { 
          error: error.message || 'Failed to estimate hours',
          suggestion: 'Please check that GEMINI_API_KEY is valid and you have access to vision models'
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error in estimate-hours:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


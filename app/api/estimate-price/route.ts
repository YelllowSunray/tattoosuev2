import { NextRequest, NextResponse } from 'next/server';
import { estimateWithGemini } from '@/lib/gemini-estimation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, imageBase64 } = body;

    // Create the prompt asking for a single price estimate
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
        imageUrl,
        imageBase64,
        prompt,
      });

      // Extract the price number from the response
      const priceMatch = result.rawResponse.match(/(\d+(?:\.\d+)?)/);
      
      if (!priceMatch) {
        return NextResponse.json(
          { error: 'Could not extract price from Gemini response', response: result.rawResponse },
          { status: 500 }
        );
      }

      const estimatedPrice = parseFloat(priceMatch[1]);

      if (isNaN(estimatedPrice) || estimatedPrice < 0) {
        return NextResponse.json(
          { error: 'Invalid price returned from Gemini', response: result.rawResponse },
          { status: 500 }
        );
      }

      return NextResponse.json({
        estimatedPrice: estimatedPrice,
        rawResponse: result.rawResponse,
        model: result.model,
      });
    } catch (error: any) {
      return NextResponse.json(
        { 
          error: error.message || 'Failed to estimate price',
          suggestion: 'Please check that GEMINI_API_KEY is valid and you have access to vision models'
        },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('Error in estimate-price:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


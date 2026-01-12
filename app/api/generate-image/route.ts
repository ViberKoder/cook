import { NextRequest, NextResponse } from 'next/server';
import { generateObject } from 'ai';

// Vercel AI Gateway - uses AI_GATEWAY_API_KEY from environment
const MODEL = 'xai/grok-4.1-fast-reasoning';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Use AI SDK to generate image description, then use that to generate image
    // Since grok-4.1-fast-reasoning doesn't directly generate images,
    // we'll use it to create a detailed image description and then use an image generation service
    // For now, we'll use the prompt directly with a service that supports image generation
    
    // Try using Vercel AI Gateway with image generation capability
    // Note: grok-4.1-fast-reasoning is a text model, so we need to use a different approach
    // We'll generate a detailed image description using the model, then use that for image generation
    
    const imageDescriptionResult = await generateObject({
      model: MODEL,
      prompt: `Create a detailed, vivid description for generating a memecoin token logo image based on this prompt: "${prompt}". 
      The description should be specific about colors, style, character design, and visual elements. 
      Make it suitable for image generation.`,
      schema: {
        type: 'object',
        properties: {
          imageDescription: {
            type: 'string',
            description: 'Detailed description for image generation',
          },
        },
        required: ['imageDescription'],
      },
    });

    const detailedPrompt = imageDescriptionResult.object.imageDescription || prompt;

    // For actual image generation, we'll need to use a service that supports images
    // Since Vercel AI Gateway with grok-4.1-fast-reasoning doesn't generate images directly,
    // we'll return the detailed description and let the frontend handle image generation
    // or use a fallback image generation service
    
    // For now, return a placeholder - you may want to integrate with an image generation API
    // that works with Vercel AI Gateway or use a separate image generation service
    
    return NextResponse.json({
      imageUrl: null,
      imageDescription: detailedPrompt,
      note: 'Image generation requires a separate image generation service. Use the imageDescription to generate the image.',
    });
  } catch (error: any) {
    console.error('Image generation API error:', error);
    const errorMessage = error.message || 'Failed to generate image';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

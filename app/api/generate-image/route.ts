import { NextRequest, NextResponse } from 'next/server';
import { experimental_generateImage as generateImage } from 'ai';

// Vercel AI Gateway - uses AI_GATEWAY_API_KEY from environment
const MODEL = 'google/imagen-4.0-generate-001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    console.log('Image generation request received, prompt:', prompt?.substring(0, 100));

    if (!prompt || typeof prompt !== 'string') {
      console.error('Invalid prompt:', prompt);
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    console.log('Using Google Imagen model:', MODEL);
    
    // Use AI SDK with Vercel AI Gateway for image generation
    // The AI_GATEWAY_API_KEY should be set in environment variables
    const result = await generateImage({
      model: MODEL,
      prompt: prompt,
    });

    console.log('Image generation result:', {
      hasImage: !!result.image,
      imageType: typeof result.image,
    });

    // The result.image is a GeneratedFile object
    // It has properties like url, base64, etc.
    let imageUrl: string;
    const image = result.image as any;
    
    if (!image) {
      console.error('No image in result');
      return NextResponse.json(
        { error: 'No image generated' },
        { status: 500 }
      );
    }
    
    // Check if GeneratedFile has a url property
    if (image.url && typeof image.url === 'string') {
      imageUrl = image.url;
    } else if (image.base64 && typeof image.base64 === 'string') {
      // If it's base64, convert to data URL
      imageUrl = `data:image/png;base64,${image.base64}`;
    } else if (image.data && image.data instanceof Uint8Array) {
      // If it's Uint8Array data
      const base64 = Buffer.from(image.data).toString('base64');
      imageUrl = `data:image/png;base64,${base64}`;
    } else if (typeof image === 'string') {
      // If it's already a string (URL or base64)
      if (image.startsWith('http://') || image.startsWith('https://')) {
        imageUrl = image;
      } else {
        imageUrl = `data:image/png;base64,${image}`;
      }
    } else {
      // Try to convert the whole object to string if it's a string
      const imageStr = String(image);
      if (imageStr.startsWith('http://') || imageStr.startsWith('https://')) {
        imageUrl = imageStr;
      } else if (imageStr.length > 0 && imageStr !== '[object Object]') {
        imageUrl = `data:image/png;base64,${imageStr}`;
      } else {
        console.error('Unexpected image format:', image);
        return NextResponse.json(
          { error: 'Unexpected image format from API' },
          { status: 500 }
        );
      }
    }

    console.log('Image generated successfully, URL length:', imageUrl.length);
    return NextResponse.json({
      imageUrl: imageUrl,
    });
  } catch (error: any) {
    console.error('Image generation API error:', error);
    console.error('Error stack:', error.stack);
    const errorMessage = error.message || 'Failed to generate image';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

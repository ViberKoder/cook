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
    
    // Check if imageUrl is a data URI - convert to TON API imgproxy URL
    if (imageUrl.startsWith('data:image/')) {
      console.error('Image is in data URI format, which is not supported by Jetton 2.0');
      return NextResponse.json(
        { error: 'Image is in data URI format. Google Imagen should return a URL. Please check your API configuration.' },
        { status: 500 }
      );
    }
    
    // If imageUrl is already a valid URL, use TON API imgproxy to cache it
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      try {
        // Encode the original URL to base64url format for TON API imgproxy
        // TON API imgproxy format: https://cache.tonapi.io/imgproxy/{hash}/rs:fill:W:H:1/g:no/{base64url_encoded_url}.webp
        // Based on example: the hash may be auto-generated on first request
        const encodedUrl = Buffer.from(imageUrl)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');
        
        // Use TON API imgproxy to cache the image
        // For Jetton 2.0 metadata, we want good quality, so use reasonable size
        // The hash in the example URL may be optional or auto-generated
        // Format: https://cache.tonapi.io/imgproxy/rs:fill:W:H:1/g:no/{base64url}.webp
        // Using 1024x1024 for good quality while keeping file size reasonable
        const tonApiUrl = `https://cache.tonapi.io/imgproxy/rs:fill:1024:1024:1/g:no/${encodedUrl}.webp`;
        
        console.log('Using TON API imgproxy URL:', tonApiUrl);
        console.log('Original URL:', imageUrl);
        
        return NextResponse.json({
          imageUrl: tonApiUrl,
          originalUrl: imageUrl,
        });
      } catch (error: any) {
        console.error('Error creating TON API URL:', error);
        // Fallback to original URL if TON API URL creation fails
        // Original URL should work for Jetton 2.0 as well
        console.warn('Falling back to original URL');
        return NextResponse.json({
          imageUrl: imageUrl,
        });
      }
    }
    
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

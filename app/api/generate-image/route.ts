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
    console.log('Image URL type:', imageUrl.substring(0, 50));
    
    // Check if imageUrl is a data URI - need to upload it first
    if (imageUrl.startsWith('data:image/')) {
      console.log('Image is in data URI format, uploading to get URL...');
      
      try {
        // Get base URL from request
        const baseUrl = request.headers.get('origin') || request.nextUrl.origin;
        
        // Upload via our upload-image endpoint
        const uploadResponse = await fetch(`${baseUrl}/api/upload-image`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageData: imageUrl }),
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          console.log('Image uploaded, got URL:', uploadData.imageUrl);
          return NextResponse.json({
            imageUrl: uploadData.imageUrl,
            originalUrl: uploadData.originalUrl || imageUrl.substring(0, 100) + '...',
          });
        } else {
          const errorData = await uploadResponse.json().catch(() => ({ error: 'Upload failed' }));
          console.error('Failed to upload image:', errorData);
          return NextResponse.json(
            { error: `Failed to upload image: ${errorData.error || 'Unknown error'}` },
            { status: 500 }
          );
        }
      } catch (uploadError: any) {
        console.error('Error uploading image:', uploadError);
        return NextResponse.json(
          { error: `Failed to upload image: ${uploadError.message || 'Unknown error'}` },
          { status: 500 }
        );
      }
    }
    
    // If imageUrl is already a valid URL, use TON API imgproxy to cache it
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      try {
        // Encode the original URL to base64url format for TON API imgproxy
        const encodedUrl = Buffer.from(imageUrl)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=/g, '');
        
        // Use TON API imgproxy to cache the image
        const tonApiUrl = `https://cache.tonapi.io/imgproxy/rs:fill:1024:1024:1/g:no/${encodedUrl}.webp`;
        
        console.log('Using TON API imgproxy URL:', tonApiUrl);
        console.log('Original URL:', imageUrl);
        
        return NextResponse.json({
          imageUrl: tonApiUrl,
          originalUrl: imageUrl,
        });
      } catch (error: any) {
        console.error('Error creating TON API URL:', error);
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

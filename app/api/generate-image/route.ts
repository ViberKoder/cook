import { NextRequest, NextResponse } from 'next/server';

// Vercel AI Gateway - uses AI_GATEWAY_API_KEY from environment
// Note: Vercel AI Gateway might not support image generation directly
// We'll try using it as a proxy to Google Cloud Vertex AI
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || '';
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

    if (!AI_GATEWAY_API_KEY) {
      console.error('AI_GATEWAY_API_KEY is not set');
      return NextResponse.json(
        { error: 'AI_GATEWAY_API_KEY is not configured. Please set AI_GATEWAY_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    console.log('Using Google Imagen model:', MODEL);
    
    // Vercel AI Gateway doesn't seem to support image generation endpoints directly
    // We need to use Google Cloud Vertex AI API directly
    // However, we can try using AI_GATEWAY_API_KEY as a proxy if it supports it
    
    // Try using Google Cloud Vertex AI API with the model name
    // The endpoint format for Vertex AI is different
    // Since we don't have a Google Cloud project ID, we'll try using Vercel AI Gateway
    // as a proxy, but it might not work for image generation
    
    // Let's try a different approach: use the model identifier that Vercel AI Gateway might understand
    // For now, return an error explaining that image generation through Vercel AI Gateway
    // might not be supported for this model
    
    return NextResponse.json(
      { 
        error: 'Image generation through Vercel AI Gateway is not currently supported for google/imagen-4.0-generate-001. Please use a different image generation service or configure Google Cloud Vertex AI API directly.' 
      },
      { status: 501 }
    );

      console.log('Vercel AI Gateway response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Vercel AI Gateway error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || 'Unknown error' };
        }
        console.error('Vercel AI Gateway error:', response.status, errorData);
        
        // If this endpoint doesn't work, try alternative approach
        throw new Error(`Vercel AI Gateway returned ${response.status}: ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      console.log('Vercel AI Gateway success, response keys:', Object.keys(data));
      console.log('Image data structure:', JSON.stringify(data).substring(0, 200));
      
      // The response format may vary, try different possible structures
      let imageUrl: string | undefined;
      
      // Try OpenAI-style response: { data: [{ url: ... }] }
      if (data.data && Array.isArray(data.data) && data.data[0]?.url) {
        imageUrl = data.data[0].url;
      }
      // Try direct url property
      else if (data.url) {
        imageUrl = data.url;
      }
      // Try base64 property
      else if (data.base64) {
        imageUrl = `data:image/png;base64,${data.base64}`;
      }
      // Try image property
      else if (data.image) {
        if (typeof data.image === 'string') {
          if (data.image.startsWith('http://') || data.image.startsWith('https://')) {
            imageUrl = data.image;
          } else {
            imageUrl = `data:image/png;base64,${data.image}`;
          }
        } else if (data.image.url) {
          imageUrl = data.image.url;
        }
      }

      if (!imageUrl) {
        console.error('No imageUrl in response, full data:', JSON.stringify(data));
        return NextResponse.json(
          { error: 'Failed to generate image - no image URL in response' },
          { status: 500 }
        );
      }

      console.log('Image generated successfully, URL length:', imageUrl.length);
      return NextResponse.json({
        imageUrl: imageUrl,
      });
    } catch (fetchError: any) {
      console.error('First attempt failed, trying alternative approach:', fetchError.message);
      
      // Alternative: Use Google Cloud Vertex AI API directly with AI_GATEWAY_API_KEY
      // This might work if AI_GATEWAY_API_KEY can be used as a proxy
      // But first, let's try using the model name directly in a different format
      
      // Since Vercel AI Gateway might not support image generation directly,
      // we might need to use a different service or approach
      return NextResponse.json(
        { error: `Image generation failed: ${fetchError.message}. Vercel AI Gateway might not support image generation for this model yet.` },
        { status: 500 }
      );
    }
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

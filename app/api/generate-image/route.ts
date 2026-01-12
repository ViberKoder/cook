import { NextRequest, NextResponse } from 'next/server';

// Vercel AI Gateway - uses AI_GATEWAY_API_KEY from environment
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
    
    // Use Vercel AI Gateway endpoint for image generation
    // The AI_GATEWAY_API_KEY should be set in environment variables
    const response = await fetch('https://api.vercel.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: prompt,
        n: 1,
      }),
    });

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
      return NextResponse.json(
        { error: errorData.error?.message || errorData.error || `Failed to generate image (status: ${response.status})` },
        { status: response.status }
      );
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

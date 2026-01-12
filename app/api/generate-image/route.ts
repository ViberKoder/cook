import { NextRequest, NextResponse } from 'next/server';

// Vercel AI Gateway - uses AI_GATEWAY_API_KEY from environment
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY || '';

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

    console.log('Calling xAI image API with model: grok-2-image-1212');
    
    // Use direct xAI API call with AI_GATEWAY_API_KEY
    // The key should work as a proxy through Vercel AI Gateway
    const response = await fetch('https://api.x.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-2-image-1212',
        prompt: prompt,
        n: 1,
      }),
    });

    console.log('xAI image API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('xAI image API error response:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || 'Unknown error' };
      }
      console.error('xAI image API error:', response.status, errorData);
      return NextResponse.json(
        { error: errorData.error?.message || errorData.error || `Failed to generate image (status: ${response.status})` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('xAI image API success, response keys:', Object.keys(data));
    console.log('Image data structure:', JSON.stringify(data).substring(0, 200));
    
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      console.error('No imageUrl in response, full data:', JSON.stringify(data));
      return NextResponse.json(
        { error: 'Failed to generate image - no image URL in response' },
        { status: 500 }
      );
    }

    console.log('Image generated successfully, URL:', imageUrl);
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

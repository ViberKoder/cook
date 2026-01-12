import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

/**
 * Serve images stored in Vercel KV
 * This is a fallback when Vercel Blob Storage is not configured
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    // Extract image ID and format from filename (e.g., "1234567890-abc123.png")
    const match = id.match(/^(.+?)\.([a-z]+)$/);
    if (!match) {
      return new NextResponse('Invalid image ID', { status: 400 });
    }
    
    const imageId = match[1];
    const format = match[2];
    const mimeType = `image/${format}`;
    
    // Get image data from KV
    const kvKey = `jetton-image:${imageId}`;
    const base64Data = await kv.get<string>(kvKey);
    
    if (!base64Data) {
      return new NextResponse('Image not found', { status: 404 });
    }
    
    // Convert base64 to Buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Return image with proper headers
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error: any) {
    console.error('Error serving image:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}

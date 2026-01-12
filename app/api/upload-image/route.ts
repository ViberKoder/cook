import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { kv } from '@vercel/kv';

/**
 * Upload image from data URI to Vercel Blob Storage or KV Storage
 * This endpoint is used when Google Imagen returns base64 data instead of URL
 * Images are stored on your Vercel domain and can be cached via TON API imgproxy
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageData } = body;

    console.log('Image upload request received');

    if (!imageData || typeof imageData !== 'string') {
      console.error('Invalid imageData:', typeof imageData);
      return NextResponse.json(
        { error: 'imageData is required and must be a string' },
        { status: 400 }
      );
    }

    // Check if it's a data URI
    let base64Data: string;
    let imageFormat = 'png';
    let mimeType = 'image/png';
    
    if (imageData.startsWith('data:image/')) {
      // Extract base64 from data URI
      const match = imageData.match(/^data:image\/([a-z]+);base64,(.+)$/);
      if (!match || !match[2]) {
        return NextResponse.json(
          { error: 'Invalid data URI format' },
          { status: 400 }
        );
      }
      imageFormat = match[1] || 'png';
      base64Data = match[2];
      mimeType = `image/${imageFormat}`;
    } else {
      // Assume it's already base64
      base64Data = imageData;
    }

    // Convert base64 to Buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Generate unique filename/ID
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const imageId = `${timestamp}-${randomId}`;
    const filename = `jetton-images/${imageId}.${imageFormat}`;

    // Get base URL for API routes
    const baseUrl = request.headers.get('origin') || request.nextUrl.origin;
    
    let imageUrl: string;

    // Try Vercel Blob Storage first (if token is configured)
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    
    if (blobToken) {
      try {
        console.log('Uploading image to Vercel Blob Storage...');
        
        const blob = await put(filename, imageBuffer, {
          access: 'public',
          contentType: mimeType,
          addRandomSuffix: false,
          token: blobToken,
        });

        imageUrl = blob.url;
        console.log('Image uploaded to Vercel Blob, URL:', imageUrl);
      } catch (blobError: any) {
        console.error('Vercel Blob upload failed:', blobError);
        // Fall through to alternative method
        imageUrl = '';
      }
    } else {
      console.log('BLOB_READ_WRITE_TOKEN not configured, using KV storage as fallback');
      imageUrl = '';
    }

    // Fallback: Store in Vercel KV and serve via API route
    if (!imageUrl) {
      try {
        console.log('Storing image in Vercel KV...');
        
        // Store image data in KV with the image ID
        const kvKey = `jetton-image:${imageId}`;
        await kv.set(kvKey, base64Data, { ex: 86400 * 30 }); // 30 days TTL
        
        // Create URL to API route that will serve the image
        imageUrl = `${baseUrl}/api/images/${imageId}.${imageFormat}`;
        console.log('Image stored in KV, serving via API route:', imageUrl);
      } catch (kvError: any) {
        console.error('KV storage failed:', kvError);
        // Last resort: return data URI encoded for TON API
        // This won't work for Jetton 2.0, but at least we return something
        return NextResponse.json(
          { 
            error: 'Failed to store image. Please configure BLOB_READ_WRITE_TOKEN or Vercel KV.' 
          },
          { status: 500 }
        );
      }
    }

    // Use TON API imgproxy to cache the image
    try {
      const encodedUrl = Buffer.from(imageUrl)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
      
      const tonApiUrl = `https://cache.tonapi.io/imgproxy/rs:fill:1024:1024:1/g:no/${encodedUrl}.webp`;
      
      console.log('Using TON API imgproxy URL:', tonApiUrl);
      
      return NextResponse.json({
        imageUrl: tonApiUrl,
        originalUrl: imageUrl,
      });
    } catch (tonError: any) {
      console.error('Error creating TON API URL:', tonError);
      // Return original URL as fallback (still works for Jetton 2.0)
      console.warn('Falling back to original URL');
      return NextResponse.json({
        imageUrl: imageUrl,
        originalUrl: imageUrl,
      });
    }
  } catch (error: any) {
    console.error('Image upload API error:', error);
    console.error('Error stack:', error.stack);
    const errorMessage = error.message || 'Failed to upload image';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

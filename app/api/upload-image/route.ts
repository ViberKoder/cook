import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

/**
 * Upload image from data URI to Vercel Blob Storage
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
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const filename = `jetton-images/${timestamp}-${randomId}.${imageFormat}`;

    // Check for Blob token
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    
    if (!blobToken) {
      console.error('BLOB_READ_WRITE_TOKEN is not configured');
      return NextResponse.json(
        { 
          error: 'BLOB_READ_WRITE_TOKEN is not configured. Please set it in Vercel Dashboard → Settings → Environment Variables, or create a Blob Store in Storage tab.' 
        },
        { status: 500 }
      );
    }

    console.log('Uploading image to Vercel Blob Storage...');
    console.log('Filename:', filename);
    console.log('Content type:', mimeType);
    console.log('Image size:', imageBuffer.length, 'bytes');
    
    try {
      // Upload to Vercel Blob Storage
      const blob = await put(filename, imageBuffer, {
        access: 'public',
        contentType: mimeType,
        addRandomSuffix: false,
        token: blobToken,
      });

      console.log('Image uploaded successfully to Vercel Blob');
      console.log('Blob URL:', blob.url);
      console.log('Blob pathname:', blob.pathname);

      const imageUrl = blob.url;

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
        console.warn('Falling back to original Vercel Blob URL');
        return NextResponse.json({
          imageUrl: imageUrl,
          originalUrl: imageUrl,
        });
      }
    } catch (blobError: any) {
      console.error('Vercel Blob upload error:', blobError);
      console.error('Error message:', blobError.message);
      console.error('Error stack:', blobError.stack);
      
      // Provide helpful error message
      let errorMessage = 'Failed to upload image to Vercel Blob Storage';
      
      if (blobError.message?.includes('token')) {
        errorMessage = 'Invalid or missing BLOB_READ_WRITE_TOKEN. Please check your Vercel environment variables.';
      } else if (blobError.message?.includes('store')) {
        errorMessage = 'Blob store not found. Please create a Blob Store in Vercel Dashboard → Storage.';
      } else {
        errorMessage = `Vercel Blob error: ${blobError.message || 'Unknown error'}`;
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
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

import { NextRequest, NextResponse } from 'next/server';

/**
 * Upload image from data URI to a temporary hosting service
 * This endpoint is used when Google Imagen returns base64 data instead of URL
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
    } else {
      // Assume it's already base64
      base64Data = imageData;
    }

    // Convert base64 to Buffer
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Upload to imgbb.com (free image hosting)
    // Note: In production, you should use your own imgbb API key
    // For now, we'll try without key (may have rate limits)
    const formData = new FormData();
    const blob = new Blob([imageBuffer], { type: `image/${imageFormat}` });
    formData.append('image', blob, `image.${imageFormat}`);

    console.log('Uploading image to imgbb...');

    // Try imgbb API
    // You can get a free API key from https://api.imgbb.com/
    const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '';
    
    if (!IMGBB_API_KEY) {
      console.warn('IMGBB_API_KEY not set, trying without key (may fail)');
    }

    const imgbbResponse = await fetch(
      `https://api.imgbb.com/1/upload${IMGBB_API_KEY ? `?key=${IMGBB_API_KEY}` : ''}`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (imgbbResponse.ok) {
      const imgbbData = await imgbbResponse.json();
      if (imgbbData.data && imgbbData.data.url) {
        const imageUrl = imgbbData.data.url;
        console.log('Image uploaded to imgbb, URL:', imageUrl);
        
        // Now use TON API imgproxy to cache it
        try {
          const encodedUrl = Buffer.from(imageUrl)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
          
          const tonApiUrl = `https://cache.tonapi.io/imgproxy/rs:fill:1024:1024:1/g:no/${encodedUrl}.webp`;
          
          return NextResponse.json({
            imageUrl: tonApiUrl,
            originalUrl: imageUrl,
          });
        } catch (tonError: any) {
          console.error('Error creating TON API URL:', tonError);
          // Return imgbb URL as fallback
          return NextResponse.json({
            imageUrl: imageUrl,
          });
        }
      } else {
        throw new Error('Failed to get URL from imgbb');
      }
    } else {
      const errorData = await imgbbResponse.json().catch(() => ({ error: 'Unknown error' }));
      console.error('imgbb upload failed:', imgbbResponse.status, errorData);
      
      // Fallback: return error
      return NextResponse.json(
        { error: `Failed to upload image: ${errorData.error || 'Unknown error'}. Please configure IMGBB_API_KEY in environment variables.` },
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

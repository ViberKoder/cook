import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, symbol, description, image, decimals } = body;

    // Validate required fields
    if (!name || !symbol || !decimals) {
      return NextResponse.json(
        { error: 'Missing required fields: name, symbol, decimals' },
        { status: 400 }
      );
    }

    // Create metadata JSON object (TEP-64 format)
    const metadata = {
      name: String(name),
      symbol: String(symbol),
      description: String(description || name),
      image: String(image || ''),
      decimals: String(decimals),
    };

    // Convert to JSON string
    const jsonString = JSON.stringify(metadata, null, 2);
    const jsonBuffer = Buffer.from(jsonString, 'utf-8');

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const filename = `jetton-metadata/${timestamp}-${randomId}.json`;

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;

    if (!blobToken) {
      console.error('BLOB_READ_WRITE_TOKEN is not configured');
      return NextResponse.json(
        {
          error: 'BLOB_READ_WRITE_TOKEN is not configured. Please set it in Vercel Dashboard → Settings → Environment Variables.'
        },
        { status: 500 }
      );
    }

    try {
      // Upload to Vercel Blob Storage
      const blob = await put(filename, jsonBuffer, {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        token: blobToken,
      });

      return NextResponse.json({ url: blob.url });
    } catch (blobError: any) {
      let errorMessage = 'Failed to upload metadata to Vercel Blob Storage';
      if (blobError.message?.includes('token')) {
        errorMessage = 'Invalid or missing BLOB_READ_WRITE_TOKEN. Please check your Vercel environment variables.';
      } else if (blobError.message?.includes('store')) {
        errorMessage = 'Blob store not found. Please create a Blob Store in Vercel Dashboard → Storage.';
      } else {
        errorMessage = `Vercel Blob error: ${blobError.message || 'Unknown error'}`;
      }
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Metadata upload API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload metadata' },
      { status: 500 }
    );
  }
}

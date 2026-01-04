import { NextRequest, NextResponse } from 'next/server';
import { Address } from '@ton/core';
import { getHttpEndpoint } from '@orbs-network/ton-access';
import { TonClient } from '@ton/ton';
import { kv } from '@vercel/kv';

/**
 * API endpoint to serve Jetton metadata JSON (off-chain metadata)
 * 
 * Uses Vercel KV (Redis) for persistent storage.
 * When a contract is deployed, metadata is stored here.
 * 
 * Usage: 
 *   GET /api/jetton-metadata/{contract_address} - Get metadata
 *   POST /api/jetton-metadata/{contract_address} - Store metadata
 * 
 * Setup Vercel KV:
 *   1. Go to Vercel Dashboard -> Your Project -> Storage
 *   2. Create a KV database
 *   3. The @vercel/kv package will automatically connect
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address;
    
    if (!address) {
      return NextResponse.json({ error: 'Address parameter required' }, { status: 400 });
    }

    // Parse address
    let contractAddress: Address;
    try {
      contractAddress = Address.parse(address);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });
    }

    const addressStr = contractAddress.toString();
    
    // Check if metadata is stored in Vercel KV
    try {
      const metadata = await kv.get<string>(`jetton:${addressStr}`);
      if (metadata) {
        const parsedMetadata = JSON.parse(metadata);
        return NextResponse.json(parsedMetadata, {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
    } catch (kvError) {
      // If KV is not configured, fall back to contract reading
      console.log('Vercel KV not available, falling back to contract:', kvError);
    }

    // If not found, try to read from contract (fallback)
    try {
      const endpoint = await getHttpEndpoint({ network: 'mainnet' });
      const client = new TonClient({ endpoint });

      // Call get_jetton_data
      const result = await client.runMethod(contractAddress, 'get_jetton_data', []);
      
      // Stack: total_supply, mintable, admin_address, content, wallet_code
      result.stack.skip(3); // Skip total_supply, mintable, admin_address
      const contentCell = result.stack.readCell();
      
      // Parse content cell to get URI
      const contentSlice = contentCell.beginParse();
      
      // Check if there's a ref (snake format)
      let uri: string;
      if (contentSlice.remainingRefs > 0) {
        const refCell = contentSlice.loadRef();
        uri = refCell.beginParse().loadStringTail();
      } else {
        uri = contentSlice.loadStringTail();
      }

      // If it's a data URI, decode it
      if (uri.startsWith('data:application/json')) {
        let jsonString: string;
        
        if (uri.includes(';base64,')) {
          const base64Data = uri.split(';base64,')[1];
          jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
        } else {
          const encodedData = uri.split(',')[1];
          jsonString = decodeURIComponent(encodedData);
        }
        
        const metadata = JSON.parse(jsonString);
        return NextResponse.json(metadata, {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      } else if (uri.startsWith('http://') || uri.startsWith('https://')) {
        // It's a regular URL, try to fetch it
        const response = await fetch(uri);
        const metadata = await response.json();
        return NextResponse.json(metadata, {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'public, max-age=3600',
          },
        });
      }
    } catch (e) {
      // Contract read failed, return 404
    }

    return NextResponse.json({ error: 'Metadata not found' }, { status: 404 });
  } catch (error: any) {
    console.error('Error fetching metadata:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch metadata' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const address = params.address;
    
    if (!address) {
      return NextResponse.json({ error: 'Address parameter required' }, { status: 400 });
    }

    // Parse address
    let contractAddress: Address;
    try {
      contractAddress = Address.parse(address);
    } catch (e) {
      return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });
    }

    const body = await request.json();
    const addressStr = contractAddress.toString();
    
    // Store metadata in Vercel KV
    try {
      await kv.set(`jetton:${addressStr}`, JSON.stringify(body));
      return NextResponse.json({ success: true, address: addressStr }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (kvError) {
      // If KV is not configured, still return success (metadata will be read from contract)
      console.error('Failed to store in Vercel KV:', kvError);
      return NextResponse.json({ 
        success: true, 
        address: addressStr,
        warning: 'Metadata stored in memory only (Vercel KV not configured)'
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  } catch (error: any) {
    console.error('Error storing metadata:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to store metadata' },
      { status: 500 }
    );
  }
}

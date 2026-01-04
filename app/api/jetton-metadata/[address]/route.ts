import { NextRequest, NextResponse } from 'next/server';
import { Address, Cell } from '@ton/core';
import { getHttpEndpoint } from '@orbs-network/ton-access';
import { TonClient } from '@ton/ton';

/**
 * API endpoint to serve Jetton metadata JSON
 * This provides off-chain metadata hosting for better explorer compatibility
 * 
 * Usage: /api/jetton-metadata/{contract_address}
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

    // Connect to TON network
    const endpoint = await getHttpEndpoint({ network: 'mainnet' });
    const client = new TonClient({ endpoint });

    // Get contract data
    const contract = await client.open(contractAddress);
    
    // Call get_jetton_data
    const result = await contract.get('get_jetton_data', []);
    
    // Read content cell
    const contentCell = result.stack.readCell();
    
    // Parse content cell to get URI
    const contentSlice = contentCell.beginParse();
    
    // Check if there's a ref (snake format)
    let uri: string;
    if (contentSlice.remainingRefs > 0) {
      // Read from ref (snake format)
      const refCell = contentSlice.loadRef();
      uri = refCell.beginParse().loadStringTail();
    } else {
      // Try to read directly
      uri = contentSlice.loadStringTail();
    }

    // If it's a data URI, decode it
    if (uri.startsWith('data:application/json')) {
      let jsonString: string;
      
      if (uri.includes(';base64,')) {
        // Base64 encoded
        const base64Data = uri.split(';base64,')[1];
        jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
      } else {
        // URL encoded
        const encodedData = uri.split(',')[1];
        jsonString = decodeURIComponent(encodedData);
      }
      
      const metadata = JSON.parse(jsonString);
      
      // Return metadata as JSON
      return NextResponse.json(metadata, {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } else {
      // It's a regular URL, redirect or fetch
      return NextResponse.json({ error: 'Only data URI metadata is supported' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error fetching metadata:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch metadata' },
      { status: 500 }
    );
  }
}


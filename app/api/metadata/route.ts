import { NextRequest, NextResponse } from 'next/server';

/**
 * API route to serve Jetton metadata JSON
 * This allows off-chain metadata hosting for better explorer compatibility
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('address');
  
  if (!address) {
    return NextResponse.json({ error: 'Address parameter required' }, { status: 400 });
  }

  // In a real implementation, you would fetch the metadata from the contract
  // For now, this is a placeholder that can be extended
  // The actual metadata should be read from the contract's content cell
  
  return NextResponse.json({
    error: 'Metadata not found. This endpoint can be extended to fetch from contract.',
  }, { status: 404 });
}







// Cocoon API Integration
// Based on https://cocoon.doge.tg/api-docs

import { COCOON_API_BASE } from './cocoonConfig';
import { Address } from '@ton/core';

export interface CocoonProxyInfo {
  endpoint: string;
  address: string;
  pubkey?: string;
}

export interface CocoonChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CocoonChatRequest {
  model?: string;
  messages: CocoonChatMessage[];
  stream?: boolean;
  client_address?: string;
}

export interface CocoonChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// Get available proxies from Cocoon API
export async function getCocoonProxies(): Promise<CocoonProxyInfo[]> {
  try {
    // Try to get proxies from Cocoon API
    // If API doesn't provide this, use default proxy
    const response = await fetch(`${COCOON_API_BASE}/api/v1/proxies`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.proxies && Array.isArray(data.proxies) && data.proxies.length > 0) {
        return data.proxies;
      }
    }

    // Fallback: return default proxy endpoint (always return at least one)
    return [{
      endpoint: COCOON_API_BASE,
      address: '',
    }];
  } catch (error) {
    console.error('Error getting Cocoon proxies:', error);
    // Fallback: return default proxy (always return at least one)
    return [{
      endpoint: COCOON_API_BASE,
      address: '',
    }];
  }
}

// Send chat completion request to Cocoon
export async function sendCocoonChatRequest(
  messages: CocoonChatMessage[],
  clientAddress?: string,
  proxyEndpoint?: string
): Promise<CocoonChatResponse> {
  const endpoint = proxyEndpoint || COCOON_API_BASE;
  
  const request: CocoonChatRequest = {
    model: 'default',
    messages,
    stream: false,
    ...(clientAddress && { client_address: clientAddress }),
  };

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add client address to headers if provided
    if (clientAddress) {
      headers['X-Client-Address'] = clientAddress;
    }

    const response = await fetch(`${endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cocoon API error:', response.status, errorText);
      throw new Error(`Cocoon API error: ${response.status} ${errorText}`);
    }

    const data: CocoonChatResponse = await response.json();
    return data;
  } catch (error: any) {
    console.error('Error sending Cocoon chat request:', error);
    throw error;
  }
}

// Get client contract info from Cocoon API
export async function getCocoonClientInfo(clientAddress: string): Promise<any> {
  try {
    const response = await fetch(`${COCOON_API_BASE}/api/v1/clients/${clientAddress}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.error('Error getting client info:', error);
    return null;
  }
}

// Deploy client contract via Cocoon API (if supported)
export async function deployCocoonClient(
  ownerAddress: Address,
  proxyAddress?: Address
): Promise<string | null> {
  try {
    const response = await fetch(`${COCOON_API_BASE}/api/v1/clients/deploy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        owner_address: ownerAddress.toString(),
        proxy_address: proxyAddress?.toString(),
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.client_address || null;
    }
    return null;
  } catch (error) {
    console.error('Error deploying client:', error);
    return null;
  }
}


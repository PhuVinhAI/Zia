/**
 * API Proxy Route - Forward requests to Bot API
 * Keeps API credentials server-side only
 */
import { NextRequest, NextResponse } from 'next/server';

const BOT_API_URL = process.env.BOT_API_URL || 'http://localhost:3001/api';
const BOT_API_KEY = process.env.BOT_API_KEY || '';

// Paths that return binary/file responses
const BINARY_PATHS = ['backup/download', 'logs/download'];

function isBinaryPath(path: string): boolean {
  return BINARY_PATHS.some((p) => path.includes(p));
}

async function proxyRequest(request: NextRequest, path: string) {
  const url = `${BOT_API_URL}/${path}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (BOT_API_KEY) {
    headers['Authorization'] = `Bearer ${BOT_API_KEY}`;
  }

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  // Forward body for POST, PUT, PATCH
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
      // Handle file uploads
      const formData = await request.formData();
      delete (headers as Record<string, string>)['Content-Type'];
      init.body = formData;
    } else {
      try {
        const body = await request.json();
        init.body = JSON.stringify(body);
      } catch {
        // Empty body is ok
      }
    }
  }

  try {
    const response = await fetch(url, init);
    
    // Handle binary/file downloads
    if (isBinaryPath(path)) {
      const contentType = response.headers.get('content-type') || '';
      
      // If response is JSON (error), parse and return
      if (contentType.includes('application/json')) {
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
      }
      
      // Return binary response with original headers
      const buffer = await response.arrayBuffer();
      return new NextResponse(buffer, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
          'Content-Disposition': response.headers.get('content-disposition') || '',
          'Content-Length': response.headers.get('content-length') || '',
        },
      });
    }
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to connect to API' },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const pathStr = path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const fullPath = searchParams ? `${pathStr}?${searchParams}` : pathStr;
  
  return proxyRequest(request, fullPath);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path.join('/'));
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path.join('/'));
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path.join('/'));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path.join('/'));
}

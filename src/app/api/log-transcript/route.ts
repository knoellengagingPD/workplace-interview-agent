import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Received log request:', body);

    // Get Cloud Run configuration
    const cloudRunUrl = process.env.NEXT_PUBLIC_CLOUD_RUN_LOGGER_URL;
    const apiKey = process.env.CLOUD_RUN_API_KEY;

    console.log('Cloud Run config:', {
      hasUrl: !!cloudRunUrl,
      hasKey: !!apiKey,
      url: cloudRunUrl
    });

    if (!cloudRunUrl || !apiKey) {
      console.error('❌ Missing Cloud Run configuration');
      return NextResponse.json(
        { error: 'Cloud Run configuration missing' },
        { status: 500 }
      );
    }

    // Forward to Cloud Run
    console.log('Sending to Cloud Run...');
    const response = await fetch(cloudRunUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(body),
    });

    console.log('Cloud Run response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Cloud Run error:', errorText);
      return NextResponse.json(
        { error: 'Cloud Run request failed', details: errorText },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('✅ Cloud Run success:', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('❌ Error in log-transcript:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

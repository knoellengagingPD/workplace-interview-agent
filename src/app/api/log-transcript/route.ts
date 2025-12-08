import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { timestamp, sessionId, speaker, transcript } = body;
    
    console.log('📝 Logging transcript to Cloud Run:', { 
      timestamp, 
      sessionId, 
      speaker,
      transcriptLength: transcript?.length 
    });
    
    // Get Cloud Run configuration from environment variables
    const cloudRunUrl = process.env.NEXT_PUBLIC_CLOUD_RUN_LOGGER_URL;
    const apiKey = process.env.CLOUD_RUN_API_KEY;
    
    if (!cloudRunUrl || !apiKey) {
      console.error('❌ Missing Cloud Run configuration:', {
        hasUrl: !!cloudRunUrl,
        hasKey: !!apiKey
      });
      return NextResponse.json(
        { error: 'Cloud Run not configured' },
        { status: 500 }
      );
    }
    
    console.log('🚀 Calling Cloud Run at:', cloudRunUrl);
    
    // Call Cloud Run function
    const response = await fetch(cloudRunUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        timestamp,
        sessionId,
        speaker,
        transcript,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Cloud Run error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      // Fixed syntax error here - was: throw new Error`...`
      throw new Error(`Cloud Run returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Successfully logged to BigQuery via Cloud Run:', result);
    
    return NextResponse.json({ 
      success: true,
      cloudRunResponse: result
    });
    
  } catch (error) {
    console.error('❌ Logging error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to log transcript',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

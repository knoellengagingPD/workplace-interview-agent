import { NextResponse } from 'next/server';

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('Missing OPENAI_API_KEY');
    return NextResponse.json(
      { error: 'Missing OPENAI_API_KEY' },
      { status: 500 }
    );
  }

  try {
    // Create an ephemeral client secret for the Realtime API
    const response = await fetch(
      'https://api.openai.com/v1/realtime/sessions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-realtime-preview-2024-12-17',
          voice: 'alloy',
          input_audio_transcription: {
            model: 'whisper-1',
          },
          turn_detection: {
            type: 'server_vad',
          },
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error(
        'Failed to create realtime session:',
        response.status,
        text
      );
      throw new Error('Failed to create realtime session');
    }

    const data = await response.json();

    // data.client_secret.value is the ephemeral token the frontend uses
    return NextResponse.json({
      clientSecret: data.client_secret.value,
      expiresAt: data.client_secret.expires_at,
    });
  } catch (error) {
    console.error('Error creating realtime client secret:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

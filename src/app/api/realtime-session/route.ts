// src/app/api/realtime-session/route.ts
import { NextResponse } from 'next/server';

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error('Missing OPENAI_API_KEY');
    return NextResponse.json(
      { error: 'Missing API key' },
      { status: 500 }
    );
  }

  try {
    // Configure the realtime session (model + voice)
    const sessionConfig = {
      session: {
        type: 'realtime',
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'alloy',
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: {
          type: 'server_vad',
        },
      },
    };

    // Create an ephemeral client secret for the Realtime API
    const response = await fetch(
      'https://api.openai.com/v1/realtime/client_secrets',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionConfig),
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('Failed to create client secret:', response.status, text);
      throw new Error('Failed to create client secret');
    }

    const data = await response.json();

    // data.value is the client secret string
    return NextResponse.json({
      clientSecret: data.value,
      expiresAt: data.expires_at,
    });
  } catch (error) {
    console.error('Error creating realtime client secret:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

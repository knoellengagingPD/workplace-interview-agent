import { NextResponse } from 'next/server';

export async function POST() {
  const apiKey = process.env.OPENAI_API_KEY;
  const agentId = process.env.OPENAI_AGENT_ID;

  if (!apiKey) {
    console.error('Missing OPENAI_API_KEY');
    return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
  }

  if (!agentId) {
    console.error('Missing OPENAI_AGENT_ID');
    return NextResponse.json({ error: 'Missing OPENAI_AGENT_ID' }, { status: 500 });
  }

  try {
    // Create a Realtime session for your Agent Builder agent
    const response = await fetch(
      `https://api.openai.com/v1/agents/${agentId}/sessions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voice: 'alloy', // per-session overrides (agent holds instructions)
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      console.error('Failed to create agent session:', response.status, text);
      throw new Error('Failed to create agent session');
    }

    const data = await response.json();

    // This clientSecret is used by the frontend for the SDP handshake
    return NextResponse.json({
      clientSecret: data.client_secret.value,
    });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

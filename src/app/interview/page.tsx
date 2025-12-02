'use client';

import { useState, useRef, useEffect } from 'react';

export default function InterviewPage() {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [aiMessages, setAiMessages] = useState<string[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [sessionId] = useState(`session-${Date.now()}`);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (pcRef.current) pcRef.current.close();
    };
  }, []);

  const logToBigQuery = async (speaker: string, transcript: string) => {
    try {
      await fetch('/api/log-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          sessionId,
          speaker,
          transcript,
        }),
      });
    } catch (err) {
      console.error('Failed to log to BigQuery:', err);
    }
  };

  const startInterview = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      const tokenResponse = await fetch('/api/realtime-session', { method: 'POST' });
      if (!tokenResponse.ok) throw new Error('Failed to get session token');

      const { clientSecret } = await tokenResponse.json();

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioRef.current = audioEl;

      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      pc.addTrack(stream.getTracks()[0]);

      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.addEventListener('open', () => {
        console.log('Data channel opened');
        setIsActive(true);
        setIsConnecting(false);

        // MINIMAL SETTINGS → Agent Builder now drives full instructions
        const sessionUpdate = {
          type: 'session.update',
          session: {
            voice: 'alloy',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: { type: 'server_vad' },
          },
        };

        dc.send(JSON.stringify(sessionUpdate));

        setTimeout(() => {
          dc.send(JSON.stringify({ type: 'response.create' }));
        }, 100);
      });

      dc.addEventListener('message', (event) => {
        const msg = JSON.parse(event.data);

        if (msg.type === 'response.audio_transcript.delta') {
          setCurrentMessage((prev) => prev + msg.delta);
        }

        if (msg.type === 'response.audio_transcript.done') {
          setAiMessages((prev) => [msg.transcript, ...prev]);
          setCurrentMessage('');
          setProgress((prev) => Math.min(prev + 12, 100));
          logToBigQuery('clarity', msg.transcript);
        }

        if (msg.type === 'conversation.item.input_audio_transcription.completed') {
          logToBigQuery('user', msg.transcript);
        }

        if (msg.type === 'response.created') {
          setCurrentMessage('');
        }
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpResponse = await fetch('https://api.openai.com/v1/realtime', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${clientSecret}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });

      if (!sdpResponse.ok) throw new Error('Failed to connect to Realtime API');

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
    } catch (err) {
      console.error('Failed to start interview:', err);
      setError(err instanceof Error ? err.message : 'Failed to start interview');
      setIsConnecting(false);
    }
  };

  const togglePause = () => {
    if (!audioRef.current) return;
    if (isPaused) audioRef.current.play();
    else audioRef.current.pause();
    setIsPaused(!isPaused);
  };

  const stopInterview = () => {
    if (pcRef.current) pcRef.current.close();
    if (audioRef.current) audioRef.current.srcObject = null;

    setIsActive(false);
    setIsPaused(false);
    setAiMessages([]);
    setCurrentMessage('');
    setProgress(0);
  };

  if (!isActive && aiMessages.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white px-4">
        <div className="text-center p-12 bg-white rounded-3xl shadow-2xl max-w-4xl">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            Welcome to the Engaging Workplace Wellbeing Interview Experience!
          </h1>

          <p className="text-gray-600 mb-6">
            When you start, Clarity will guide you through a series of questions designed to assess
            workplace wellbeing, safety, purpose, support, work-life balance, and more.
          </p>

          {error && (
            <div className="p-4 bg-red-100 text-red-700 rounded-lg mb-4">{error}</div>
          )}

          <button
            onClick={startInterview}
            disabled={isConnecting}
            className="px-12 py-6 bg-blue-600 text-white text-xl font-semibold rounded-xl shadow-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isConnecting ? 'Connecting…' : 'Start Interview →'}
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-start p-8">
      <div className="relative mb-8 mt-16">
        <div
          className={`w-96 h-96 rounded-full bg-gradient-to-br from-blue-300 via-blue-500 to-blue-700 shadow-2xl ${
            isActive ? 'animate-pulse-strong' : ''
          }`}
        ></div>
      </div>

      <div className="w-full max-w-3xl mb-8 flex items-center gap-4">
        <div className="flex-1">
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500 text-center mt-2">Progress</p>
        </div>

        <button
          onClick={togglePause}
          className="px-4 py-4 bg-white text-blue-700 text-sm font-bold rounded-lg border-2 border-blue-700 shadow-md hover:shadow-lg transition w-20 h-20"
        >
          <div>{isPaused ? 'Resume' : 'Pause'}</div>
        </button>

        <button
          onClick={stopInterview}
          className="px-4 py-4 bg-white text-blue-700 text-sm font-bold rounded-lg border-2 border-blue-700 shadow-md hover:shadow-lg transition w-20 h-20"
        >
          <div>Stop</div>
        </button>
      </div>

      {currentMessage && (
        <div className="w-full max-w-3xl mb-2 animate-fade-in">
          <p className="text-xl text-gray-800 font-bold text-center leading-relaxed">
            {currentMessage}
          </p>
        </div>
      )}

      {!currentMessage && aiMessages.length > 0 && (
        <div className="w-full max-w-3xl mb-2">
          <p className="text-xl text-gray-800 font-bold text-center leading-relaxed">
            {aiMessages[0]}
          </p>
        </div>
      )}

      <div className="w-full max-w-3xl mb-6 overflow-hidden" style={{ maxHeight: 150 }}>
        <div className="flex flex-col">
          {aiMessages.slice(1, 4).map((text, i) => (
            <div key={i} className="py-2 opacity-60">
              <p className="text-base text-gray-600 text-center leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }

        @keyframes pulse-strong {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.85;
            transform: scale(1.05);
          }
        }

        .animate-pulse-strong {
          animation: pulse-strong 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

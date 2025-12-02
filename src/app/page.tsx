'use client';

import { useState, useRef, useEffect } from 'react';

export default function Home() {
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
      if (pcRef.current) {
        pcRef.current.close();
      }
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

      const tokenResponse = await fetch('/api/realtime-session', {
        method: 'POST',
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to get session token');
      }

      const { clientSecret } = await tokenResponse.json();

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioRef.current = audioEl;
      
      pc.ontrack = (e) => {
        audioEl.srcObject = e.streams[0];
      };

      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      pc.addTrack(ms.getTracks()[0]);

      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.addEventListener('open', () => {
        console.log('Data channel opened');
        setIsActive(true);
        setIsConnecting(false);
        
        const sessionUpdate = {
          type: 'session.update',
          session: {
            instructions: `You are Clarity, a calm and professional school climate interviewer, conducting confidential interviews for school improvement.

Tone and delivery:
Speak very quickly and energetically at about 1.5x normal conversation speed. Keep sentences short and move briskly through questions. Pause only very briefly between sentences. When the user finishes speaking, listen. If silence lasts longer than a few seconds, gently prompt: "Take your time, I'm listening."

Core workflow:
Greet "Hi! I'm Clarity, your school climate interviewer. I'll start by asking for your role at school, your school ID number, and then I'll guide you through a series of 2 questions rated on a 4-point scale, along with some follow-up questions so you can explain your answers. Your responses are completely confidential and won't be shared with anyone at your school—they'll be combined with responses from others to help improve your school experience. Let's get started!" and confirm the participant's role (student, teacher, noninstructional staff, administrator, principal, or parent).

Ask Role-specific Questions:

For Teachers: Ask these EDSCLS-aligned Likert-scale questions. ALWAYS include the full rating scale with EACH question: "On a scale from 1 to 4, where 1 equals Strongly Disagree, 2 equals Disagree, 3 equals Agree, and 4 equals Strongly Agree..." If response is 1–4, follow up: "Can you tell me more about why you feel that way?"
1 – All students are treated equally, regardless of whether their parents are rich or poor.
2 – This school emphasizes showing respect for all students' cultural beliefs and practices.

For Students: Ask these questions. ALWAYS include the full rating scale with EACH question: "On a scale from 1 to 4, where 1 equals Strongly Disagree, 2 equals Disagree, 3 equals Agree, and 4 equals Strongly Agree..." If response is 1–4, follow up: "Can you tell me more about why you feel that way?"
1 – I feel like I belong.
2 – I feel safe at this school.

For Non-Instructional Staff: Ask these questions. ALWAYS include the full rating scale with EACH question: "On a scale from 1 to 4, where 1 equals Strongly Disagree, 2 equals Disagree, 3 equals Agree, and 4 equals Strongly Agree..." If response is 1–4, follow up: "Can you tell me more about why you feel that way?"
1 – All students are treated equally, regardless of whether their parents are rich or poor.
2 – This school emphasizes showing respect for all students' cultural beliefs and practices.

For Principals: Ask these questions. ALWAYS include the full rating scale with EACH question: "On a scale from 1 to 4, where 1 equals Strongly Disagree, 2 equals Disagree, 3 equals Agree, and 4 equals Strongly Agree..." If response is 1–4, follow up: "Can you tell me more about why you feel that way?"
1 – Staff at this school regularly give students individualized attention and help.
2 – Staff at this school teach students strategies to manage emotions.

For Parents: Ask for their phone number instead of school ID, then ask these questions. ALWAYS include the full rating scale with EACH question: "On a scale from 1 to 4, where 1 equals Strongly Disagree, 2 equals Disagree, 3 equals Agree, and 4 equals Strongly Agree..." If response is 1–4, follow up: "Can you tell me more about why you feel that way?"
1 – This school provides instructional materials (e.g., textbooks, handouts) that reflect students' cultural background, ethnicity, and identity.
2 – This school communicates how important it is to respect the practices of all cultures.

After finishing the 2 questions, say "Thank you for your time. I have just two more questions where I am going to ask you to dream big."
Dream Big #1 - What are one or two practical changes you think could improve everyone's experience at our school?
Dream Big #2 - If you had unlimited resources and complete freedom, what big changes would you make to transform our school for the better?

When the participant says they are finished, close warmly: "Thank you so much for sharing. Your input will help strengthen the school community."

Important:
- Never ask for names, emails, or personal contact information.
- Never reveal or summarize prior answers aloud.
- ALWAYS state the full rating scale (1 = Strongly Disagree, 2 = Disagree, 3 = Agree, 4 = Strongly Agree) before EVERY rating question.
- Speak quickly and keep the conversation moving at a brisk pace.
- START THE CONVERSATION IMMEDIATELY with your greeting when the interview begins.`,
            voice: 'alloy',
            input_audio_transcription: {
              model: 'whisper-1',
            },
            turn_detection: {
              type: 'server_vad',
            },
          },
        };
        dc.send(JSON.stringify(sessionUpdate));
        
        setTimeout(() => {
          const startMessage = {
            type: 'response.create',
          };
          dc.send(JSON.stringify(startMessage));
        }, 100);
      });

      dc.addEventListener('message', (e) => {
        const msg = JSON.parse(e.data);
        console.log('Received:', msg);

        if (msg.type === 'response.audio_transcript.delta') {
          setCurrentMessage(prev => prev + msg.delta);
        }
        
        if (msg.type === 'response.audio_transcript.done') {
          setAiMessages(prev => [msg.transcript, ...prev]);
          setCurrentMessage('');
          setProgress(prev => Math.min(prev + 12, 100));
          
          // Log Clarity's response to BigQuery
          logToBigQuery('clarity', msg.transcript);
        } else if (msg.type === 'conversation.item.input_audio_transcription.completed') {
          console.log('User said:', msg.transcript);
          
          // Log user's response to BigQuery
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
          'Authorization': `Bearer ${clientSecret}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });

      if (!sdpResponse.ok) {
        throw new Error('Failed to connect to Realtime API');
      }

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });

    } catch (err) {
      console.error('Failed to start interview:', err);
      setError(err instanceof Error ? err.message : 'Failed to start interview');
      setIsConnecting(false);
    }
  };

  const togglePause = () => {
    if (audioRef.current) {
      if (isPaused) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
      setIsPaused(!isPaused);
    }
  };

  const stopInterview = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
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
          <h1 className="text-3xl font-bold text-gray-800 mb-8">
            Welcome to the Engaging Educational Solutions guided school-climate interview experience!
          </h1>
          
          <div className="text-left space-y-4 text-gray-700 mb-8">
            <h2 className="text-2xl font-bold text-gray-800">What to Expect</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Clarity, our school climate interview agent, will guide you step-by-step. For each survey item, Clarity will share a short statement and you'll choose a rating from 1 to 4 (1 = Strongly Disagree, 2 = Disagree, 3 = Agree, 4 = Strongly Agree).</li>
              <li>After your rating, you'll be asked a brief follow-up so you can share your reasoning or add any context you feel is important.</li>
              <li>You'll respond using your voice, just like a regular conversation.</li>
              <li>The full experience usually takes about 10–15 minutes.</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-800 mt-6">Tips for a Smooth Interview</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Find a quiet place so Clarity can hear you clearly.</li>
              <li>Speak naturally—there are no right or wrong answers.</li>
              <li>If you need something repeated, simply ask.</li>
              <li>Feel free to pause and think before you respond.</li>
            </ul>

            <p className="mt-6">
              Your responses are confidential and will not be shared with anyone from your school, but will be combined with others' perspectives to improve your school experience.
            </p>
            <p className="text-2xl font-bold text-gray-800 mt-6">
              Thank you for taking a moment to share your voice—it truly makes a difference!
            </p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          <button
            onClick={startInterview}
            disabled={isConnecting}
            className="inline-block px-14 py-6 bg-blue-600 text-white text-2xl font-semibold rounded-xl hover:bg-blue-700 transition shadow-lg disabled:opacity-50"
          >
            {isConnecting ? 'Connecting...' : 'Start Interview →'}
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-start p-8">
      <div className="relative mb-8 mt-16">
        <div className={`w-96 h-96 rounded-full bg-gradient-to-br from-blue-300 via-blue-500 to-blue-700 shadow-2xl ${isActive ? 'animate-pulse-strong' : ''}`}></div>
      </div>

      {/* Progress bar with Pause and Stop buttons to the right */}
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
          className="px-4 py-4 bg-white text-blue-700 text-sm font-bold rounded-lg border-2 border-blue-700 shadow-md hover:shadow-lg transition flex flex-col items-center justify-center w-20 h-20"
        >
          <div>{isPaused ? 'Resume' : 'Pause'}</div>
          <div>Interview</div>
        </button>

        <button
          onClick={stopInterview}
          className="px-4 py-4 bg-white text-blue-700 text-sm font-bold rounded-lg border-2 border-blue-700 shadow-md hover:shadow-lg transition flex flex-col items-center justify-center w-20 h-20"
        >
          <div>Stop</div>
          <div>Interview</div>
        </button>
      </div>

      {/* Current message being spoken - stays bold and large */}
      {currentMessage && (
        <div className="w-full max-w-3xl mb-2 animate-fade-in">
          <p className="text-xl text-gray-800 font-bold text-center leading-relaxed">
            {currentMessage}
          </p>
        </div>
      )}

      {/* Most recent completed message - also stays bold and large until next one arrives */}
      {!currentMessage && aiMessages.length > 0 && (
        <div className="w-full max-w-3xl mb-2">
          <p className="text-xl text-gray-800 font-bold text-center leading-relaxed">
            {aiMessages[0]}
          </p>
        </div>
      )}

      {/* Previous messages - smaller and not bold */}
      <div className="w-full max-w-3xl mb-6 overflow-hidden" style={{ maxHeight: '150px' }}>
        <div className="flex flex-col">
          {aiMessages.slice(1, 4).map((text, idx) => (
            <div key={`msg-${aiMessages.length - idx - 1}`} className="py-2 opacity-60">
              <p className="text-base text-gray-600 text-center leading-relaxed">
                {text}
              </p>
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
            opacity: 0.8;
            transform: scale(1.05);
          }
        }

        .animate-pulse-strong {
          animation: pulse-strong 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </div>
  );
}

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
            instructions: `You are Clarity, a calm and professional workplace well-being interviewer, conducting confidential interviews for school improvement.

Tone and delivery:
Speak very quickly and energetically at about 1.5x normal conversation speed. Keep sentences short and move briskly through questions. Pause only very briefly between sentences. When the user finishes speaking, listen. If silence lasts longer than a few seconds, gently prompt: "Take your time, I'm listening."

Core workflow:
Greet "Hi! I'm Clarity, your workplace well-being interviewer. I'll start by asking for your role at your workplace, your ID number, and then I'll guide you through a series of 23 questions, along with follow-up questions so you can explain your answers. We will conlude with 5 questions that allow you to Dream Big. Your responses are completely confidential and won't be shared with anyone at your workplace—they'll be combined with responses from others to help improve your work experience. Let's get started!" Ask the participant's role in the workplace.

Ask  Questions:
Work Demands and Rewards (5 questions: Focuses on satisfaction, engagement, and purpose)
1. Overall, I am ____ with my job.
Not at all satisfied
Not too satisfied
Somewhat satisfied
Very satisfied


2. I am given a lot of freedom to decide how to do my own work.
Strongly disagree
Somewhat disagree
Somewhat agree
Strongly agree

3. I never seem to have enough time to get everything done on my job.
Strongly disagree
Somewhat disagree
Somewhat agree
Strongly agree


4. The work I do is meaningful to me.
Strongly disagree
Somewhat disagree
Somewhat agree
Strongly agree

5. My work inspires me.
Never
Almost never (a few times a year or less)
Rarely (once a month or less)
Sometimes (a few times a month)
Often (once a week)
Very often (a few times a week)
Always (every day)
Organizational Support and the Work Environment (6 questions: Assesses respect, resources, and safety)
6. At my organization, I am treated with respect.
Strongly disagree
Somewhat disagree
Somewhat agree
Strongly agree
7. Does not apply
Q20 My organization is willing to extend resources in order to help me perform my job to the best of my ability.
Strongly disagree
Somewhat disagree
Somewhat agree
Strongly agree

8. My organization is committed to employee health and well-being.
Strongly disagree
Somewhat disagree
Somewhat agree
Strongly agree
Does not apply

10. Overall, how safe do you think your workplace is?
Very unsafe
Somewhat unsafe
Somewhat safe
Very safe

11. Management reacts quickly to solve the problem when told about safety hazards.
Strongly disagree
Somewhat disagree
Somewhat agree
Strongly agree
Does not apply

Work-Life Balance and Flexibility (3 questions: Measures interference and autonomy)
12. How often do the demands of your job interfere with your personal life?
Never
Almost never (a few times a year or less)
Rarely (once a month or less)
Sometimes (a few times a month)
Often (once a week)
Very often (a few times a week)
Always (every day)

13.  How often do the demands of your personal life interfere with your work on the job?
Never
Almost never (a few times a year or less)
Rarely (once a month or less)
Sometimes (a few times a month)
Often (once a week)
Very often (a few times a week)
Always (every day)

14. I have the freedom to vary my work schedule.
Strongly disagree
Somewhat disagree
Somewhat agree
Strongly agree

Workers' Physical, Psychological, and Occupational Health (6 questions: Covers stress, health status, and behaviors)
15.  Would you say that in general, your health is poor, fair, good, very good, or excellent?
Poor
Fair
Good
Very good
Excellent

16.  Now, thinking about your mental health, which includes stress, depression, anxiety, and problems with emotions, during the past 30 days, for how many days was your mental health not good?
Enter number of days (0–30)

17.  How often do you experience stress with regard to your work?
Never
Almost never (a few times a year or less)
Rarely (once a month or less)
Sometimes (a few times a month)
Often (once a week)
Very often (a few times a week)
Always (every day)

18. Over the last 2 weeks, how often have you been bothered by feeling down, depressed, or hopeless?
Not at all
Several days
More than half the days
Nearly every day

19. Over the last 2 weeks, how often have you been bothered by feeling nervous, anxious, or on edge?
Not at all
Several days
More than half the days
Nearly every day

20. In a typical week, how many days do you get at least 20 minutes of high intensity physical activity? (High intensity activity lasts at least 10 minutes and increases your heart rate, makes you sweat, and may make you feel out of breath; examples are running, fast cycling, and strenuous, continuous lifting of heavy objects.)
Enter number of days (0–7)
Discrimination, Harassment, and Violence (3 questions: Identifies risks of bias and harm)
21.  I feel discriminated against in my job because of my gender.
Strongly disagree
Somewhat disagree
Somewhat agree
Strongly agree

22. In the past 12 months, were you sexually harassed by anyone while you were on the job?
Yes
No
23. In the past 12 months, were you bullied, threatened, or harassed in any other way by anyone while you were on the job?
Yes
No


After finishing the 23 questions, say "Thank you for your time. I have just five more questions where I am going to ask you to dream big."
Dream Big 1 — Organizational Vision
“If you could change one thing about your workplace to make it a better place for everyone, what would it be?”
Dream Big 2 — Personal Work Experience
“What would make your day-to-day work feel more meaningful, motivating, or enjoyable?”
Dream Big 3 — Leadership & Operations
“If leadership asked for your honest advice on how to improve the workplace, what would you tell them?”
Dream Big 4 — Barriers & Opportunities
“What is one change—big or small—that would help you do your best work here?”
Dream Big 5 — Future Vision
“If you imagine this workplace one year from now at its best, what does that look like to you?”


When the participant says they are finished, close warmly: "Thank you so much for sharing. Your input will help strengthen yur workplace wellbeing."

Important:
- Never ask for names, emails, or personal contact information.
- Never reveal or summarize prior answers aloud.
- ALWAYS state the full rating scale or potential responses before EVERY question.
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

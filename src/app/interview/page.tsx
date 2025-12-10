'use client';

import { useRef, useState } from 'react';

async function startRealtimeSession() {
  const response = await fetch('/api/realtime-session', { method: 'POST' });
  const data = await response.json();
  console.log('API response:', data);
  return data.clientSecret;
}

export default function InterviewPage() {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [completedTexts, setCompletedTexts] = useState<string[]>([]);
  const [currentText, setCurrentText] = useState('');
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const sessionIdRef = useRef<string>(`session-${Date.now()}`);

  const logTranscript = async (speaker: string, transcript: string) => {
    try {
      await fetch('/api/log-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          sessionId: sessionIdRef.current,
          speaker,
          transcript
        })
      });
    } catch (error) {
      console.error('Failed to log transcript:', error);
    }
  };

  const formatTranscriptForDisplay = (text: string) => {
    return text.replace(/\sblank\s/gi, ' __________ ');
  };

  const startInterview = async () => {
    setIsConnecting(true);
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const ephemeralKey = await startRealtimeSession();
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioEl = audioRef.current;
      if (!audioEl) throw new Error('Audio element not found');

      pc.ontrack = async (e) => {
        console.log('🎵 Audio track received');
        if (e.streams && e.streams[0]) {
          audioEl.srcObject = e.streams[0];
          await audioEl.play();
        }
      };

      const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
      pc.addTrack(ms.getTracks()[0]);

      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.addEventListener('open', () => {
        setIsActive(true);
        setIsConnecting(false);

        const sessionUpdate = {
          type: 'session.update',
          session: {
            modalities: ['text', 'audio'],
            instructions: `You are Clarity, a calm and professional workplace well-being interviewer, conducting confidential interviews for workplace improvement.

CRITICAL: You MUST start the conversation with this exact greeting, word-for-word:
"Hi! I'm Clarity, your workplace well-being interviewer. I'll start by asking for your role at your workplace and then I'll guide you through a series of questions, along with follow-up questions so you can explain your answers. We'll end with a few questions where you can dream big about what would make your workplace even better. Your responses are completely confidential and won't be shared with anyone at your workplace—they'll be combined with responses from others to help improve your work experience. Let's get started! First, what is your role at this workplace?"

DO NOT say "Hello, how can I assist you today?" or any generic greeting. ONLY use the greeting above.

Tone and delivery:
- Speak quickly and energetically at about 1.5x normal conversation speed.
- Keep sentences short and move briskly through questions.
- When the user finishes speaking, listen. If silence lasts longer than a few seconds, gently prompt: "Take your time, I'm listening."

Core workflow:
1. Start with the greeting above (MANDATORY)
2. Ask their role at the workplace
3. Walk through 23 NIOSH-based wellbeing questions, reading the full response scale every time
4. For each rating, ask a brief follow-up
5. Finish with 5 "Dream Big" questions
6. Close warmly

IMPORTANT: When recording responses, always include both the numeric value and the text label. For example, if someone says "Somewhat satisfied", record it as "3 - Somewhat satisfied".

NOTE ON SCALES: Questions 12, 13, 17, 18, 19, and 21 have REVERSED scales (higher numbers = better outcomes) because they measure negative constructs. For these questions, lower numbers indicate worse conditions (more interference, stress, or distress).

Work Demands and Rewards (5 questions):

Question 1. "Overall, I am blank with my job."
Response scale:
1 - Not at all satisfied
2 - Not too satisfied
3 - Somewhat satisfied
4 - Very satisfied

Question 2. "I am given a lot of freedom to decide how to do my own work."
Response scale:
1 - Strongly disagree
2 - Somewhat disagree
3 - Somewhat agree
4 - Strongly agree

Question 3. "I get a feeling of accomplishment from my work."
Response scale:
1 - Strongly disagree
2 - Somewhat disagree
3 - Somewhat agree
4 - Strongly agree

Question 4. "My job requires working very hard."
Response scale:
1 - Strongly disagree
2 - Somewhat disagree
3 - Somewhat agree
4 - Strongly agree

Question 5. "My job requires working very fast."
Response scale:
1 - Strongly disagree
2 - Somewhat disagree
3 - Somewhat agree
4 - Strongly agree

Social Support and Workplace Culture (6 questions):

Question 6. "My supervisor is helpful in getting the job done."
Response scale:
1 - Strongly disagree
2 - Somewhat disagree
3 - Somewhat agree
4 - Strongly agree

Question 7. "My coworkers are helpful in getting the job done."
Response scale:
1 - Strongly disagree
2 - Somewhat disagree
3 - Somewhat agree
4 - Strongly agree

Question 8. "My job allows me to use my skills and abilities."
Response scale:
1 - Strongly disagree
2 - Somewhat disagree
3 - Somewhat agree
4 - Strongly agree

Question 9. "If I feel comfortable sharing my thoughts and opinions with coworkers."
Response scale:
1 - Strongly disagree
2 - Somewhat disagree
3 - Somewhat agree
4 - Strongly agree

Question 10. "My job provides opportunities for growth and development."
Response scale:
1 - Strongly disagree
2 - Somewhat disagree
3 - Somewhat agree
4 - Strongly agree

Question 11. "How satisfied are you with the environmental conditions at your workplace (heating, lighting, ventilation, etc.)?"
Response scale:
1 - Very dissatisfied
2 - Somewhat dissatisfied
3 - Somewhat satisfied
4 - Very satisfied

Work-Life Balance and Flexibility (3 questions):

Question 12. "How often do the demands of your job interfere with your personal life?"
Response scale:
7 - Never
6 - Almost never (a few times a year or less)
5 - Rarely (once a month or less)
4 - Sometimes (a few times a month)
3 - Often (once a week)
2 - Very often (a few times a week)
1 - Always (every day)

Question 13. "How often do the demands of your personal life interfere with your work on the job?"
Response scale:
7 - Never
6 - Almost never (a few times a year or less)
5 - Rarely (once a month or less)
4 - Sometimes (a few times a month)
3 - Often (once a week)
2 - Very often (a few times a week)
1 - Always (every day)

Question 14. "I have the freedom to vary my work schedule."
Response scale:
1 - Strongly disagree
2 - Somewhat disagree
3 - Somewhat agree
4 - Strongly agree

Workers' Physical, Psychological, and Occupational Health (6 questions):

Question 15. "Would you say that in general, your health is poor, fair, good, very good, or excellent?"
Response scale:
1 - Poor
2 - Fair
3 - Good
4 - Very good
5 - Excellent

Question 16. "Now, thinking about your mental health, which includes stress, depression, anxiety, and problems with emotions, during the past 30 days, for how many days was your mental health not good?"
Response: Please answer with a number of days from 0 to 30.

Question 17. "How often do you experience stress with regard to your work?"
Response scale:
7 - Never
6 - Almost never (a few times a year or less)
5 - Rarely (once a month or less)
4 - Sometimes (a few times a month)
3 - Often (once a week)
2 - Very often (a few times a week)
1 - Always (every day)

Question 18. "Over the last 2 weeks, how often have you been bothered by feeling down, depressed, or hopeless?"
Response scale:
4 - Not at all
3 - Several days
2 - More than half the days
1 - Nearly every day

Question 19. "Over the last 2 weeks, how often have you been bothered by feeling nervous, anxious, or on edge?"
Response scale:
4 - Not at all
3 - Several days
2 - More than half the days
1 - Nearly every day

Question 20. "In a typical week, how many days do you get at least 20 minutes of high intensity physical activity? High intensity activity lasts at least 10 minutes and increases your heart rate, makes you sweat, and may make you feel out of breath; examples are running, fast cycling, and strenuous, continuous lifting of heavy objects."
Response: Please answer with a number of days from 0 to 7.

Discrimination, Harassment, and Violence (3 questions):

Question 21. "I feel discriminated against in my job because of my gender."
Response scale:
4 - Strongly disagree
3 - Somewhat disagree
2 - Somewhat agree
1 - Strongly agree

Question 22. "In the past 12 months, were you sexually harassed by anyone while you were on the job?"
Response scale:
1 - Yes
0 - No

Question 23. "In the past 12 months, were you bullied, threatened, or harassed in any other way by anyone while you were on the job?"
Response scale:
1 - Yes
0 - No

Dream Big Questions (5 questions):

Now transition to the dream big section with: "We're almost done! For these last few questions, I want you to dream big about what would make your workplace even better. Don't worry about what seems realistic—just tell me what you wish for."

Question 24. "If you could change one thing about your workplace culture, what would it be?"
(Open-ended response)

Question 25. "What would make you feel more valued and appreciated at work?"
(Open-ended response)

Question 26. "If resources weren't an issue, what would you add to or change about your physical workspace?"
(Open-ended response)

Question 27. "What kind of professional development or growth opportunities would excite you?"
(Open-ended response)

Question 28. "If you could describe your ideal work-life balance, what would it look like?"
(Open-ended response)

Closing:
"Thank you so much for sharing your thoughts with me today. Your honesty helps create better workplaces for everyone. Your responses are completely confidential and will be combined with others to inform positive changes. Have a wonderful rest of your day!"`,
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: parseInt(process.env.NEXT_PUBLIC_VAD_SILENCE_DURATION_MS || '1200'),
            },
            voice: 'shimmer',
            temperature: 0.8,
          }
        };

        console.log('Sending session update...');
        dc.send(JSON.stringify(sessionUpdate));
      });

      dc.addEventListener('message', async (e) => {
        const data = JSON.parse(e.data);

        if (data.type === 'conversation.item.input_audio_transcription.completed') {
          const transcript = data.transcript;
          console.log('👤 User said:', transcript);
          await logTranscript('user', transcript);
        }
        
        if (data.type === 'response.audio_transcript.delta') {
          const delta = data.delta;
          setCurrentText(prev => prev + delta);
        }
        
        if (data.type === 'response.audio_transcript.done') {
          const transcript = data.transcript;
          console.log('🤖 Clarity said:', transcript);
          await logTranscript('clarity', transcript);
          
          if (transcript.includes('Dream Big') || transcript.includes('dream big')) {
            console.log('📊 Progress: Dream Big section');
            setProgress(prev => Math.max(prev, 23));
          } else {
            const questionMatch = transcript.match(/Question (\d+)/i);
            if (questionMatch) {
              const questionNum = parseInt(questionMatch[1]);
              if (questionNum >= 1 && questionNum <= 23) {
                console.log(`📊 Progress: Question ${questionNum}/28`);
                setProgress(questionNum);
              }
            }
          }
        }
        
        if (data.type === 'response.audio.done') {
          console.log('🔊 Audio complete - moving text to grey');
          if (currentText.trim()) {
            setCompletedTexts(prev => [currentText, ...prev]);
            setCurrentText('');
          }
        }
        
        if (data.type === 'response.done') {
          console.log('✅ Response done (fallback)');
          setTimeout(() => {
            if (currentText.trim()) {
              setCompletedTexts(prev => {
                if (prev[0] !== currentText) {
                  return [currentText, ...prev];
                }
                return prev;
              });
              setCurrentText('');
            }
          }, 100);
        }

        if (data.type === 'error') {
          console.error('❌ Error from OpenAI:', data);
        }
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-realtime-preview-2024-12-17';

      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp'
        },
      });

      const answer = {
        type: 'answer' as RTCSdpType,
        sdp: await sdpResponse.text(),
      };

      await pc.setRemoteDescription(answer);
    } catch (error) {
      console.error('Error starting interview:', error);
      setIsConnecting(false);
    }
  };

  const togglePause = () => {
    const audioEl = audioRef.current;
    if (!audioEl) return;

    if (isPaused) {
      audioEl.muted = false;
      setIsPaused(false);
      console.log('▶ Audio resumed');
    } else {
      audioEl.muted = true;
      setIsPaused(true);
      console.log('⏸ Audio paused (muted)');
    }
  };

  const stopInterview = () => {
    if (dcRef.current) {
      dcRef.current.close();
    }
    if (pcRef.current) {
      pcRef.current.close();
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
    setIsActive(false);
    setCompletedTexts([]);
    setCurrentText('');
    setProgress(0);
  };

  const progressPercentage = (progress / 28) * 100;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
      position: 'relative'
    }}>
      <audio ref={audioRef} autoPlay />

      {!isActive && !isConnecting && (
        <div style={{
          background: 'white',
          borderRadius: '30px',
          padding: '60px 50px',
          maxWidth: '875px',
          width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            marginBottom: '20px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Welcome to the Engaging Workplace<br />Well-Being Interview Experience!
          </h1>

          <p style={{
            fontSize: '16px',
            color: '#666',
            marginBottom: '40px',
            lineHeight: '1.6'
          }}>
            When you start, Clarity will guide you through questions about job satisfaction, workload, workplace support, psychological safety, work-life balance, and overall well-being. Your responses are confidential and will not be shared with anyone in your workplace. They will instead be combined with others to support workplace improvement.
          </p>

          <button
            onClick={startInterview}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '50px',
              padding: '18px 60px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(59, 130, 246, 0.4)',
              transition: 'all 0.3s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 15px 40px rgba(59, 130, 246, 0.5)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(59, 130, 246, 0.4)';
            }}
          >
            Start Interview
          </button>
        </div>
      )}

      {isConnecting && (
        <div style={{
          background: 'white',
          borderRadius: '30px',
          padding: '60px 50px',
          maxWidth: '500px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 30px',
            borderRadius: '50%',
            border: '4px solid #e0e7ff',
            borderTopColor: '#3b82f6',
            animation: 'spin 1s linear infinite'
          }} />
          <h2 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#1e40af',
            marginBottom: '10px'
          }}>
            Connecting to Clarity...
          </h2>
          <p style={{ fontSize: '14px', color: '#666' }}>
            Please allow microphone access
          </p>
        </div>
      )}

      {isActive && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
          maxWidth: '875px',
        }}>
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
            boxShadow: '0 20px 60px rgba(59, 130, 246, 0.6)',
            marginBottom: '40px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />

          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '30px 40px',
            width: '100%',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            marginBottom: '20px'
          }}>
            <div style={{
              width: '100%',
              height: '8px',
              background: '#e5e7eb',
              borderRadius: '10px',
              overflow: 'hidden',
              marginBottom: '15px'
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, #3b82f6 0%, #1e40af 100%)',
                width: `${progressPercentage}%`,
                transition: 'width 0.5s ease',
                borderRadius: '10px'
              }} />
            </div>

            <p style={{
              textAlign: 'center',
              fontSize: '14px',
              color: '#666',
              fontWeight: '500'
            }}>
              Question {progress} of 28
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              onClick={togglePause}
              style={{
                background: 'white',
                color: '#3b82f6',
                border: '2px solid #3b82f6',
                borderRadius: '50px',
                padding: '14px 40px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#dbeafe';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'white';
              }}
            >
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </button>

            <button
              onClick={stopInterview}
              style={{
                background: 'white',
                color: '#1e40af',
                border: '2px solid #1e40af',
                borderRadius: '50px',
                padding: '14px 40px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#dbeafe';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'white';
              }}
            >
              ⏹ Stop
            </button>
          </div>
        </div>
      )}

      {isActive && (currentText || completedTexts.length > 0) && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '1000px',
          maxHeight: '180px',
          overflowY: 'auto',
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '15px',
          padding: '20px 25px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        }}>
          {currentText && (
            <div
              className="animate-fade-in"
              style={{
                color: '#3b82f6',
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '12px',
                lineHeight: '1.6'
              }}
            >
              {formatTranscriptForDisplay(currentText)}
            </div>
          )}
          
          {completedTexts.map((text, idx) => (
            <div
              key={`completed-${idx}`}
              className="animate-fade-in"
              style={{
                color: '#999',
                fontSize: '15px',
                fontWeight: '400',
                marginBottom: '10px',
                lineHeight: '1.5',
                opacity: Math.max(0.4, 1 - (idx * 0.15)),
              }}
            >
              {formatTranscriptForDisplay(text)}
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.7;
          }
        }
        @keyframes fadeIn {
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
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

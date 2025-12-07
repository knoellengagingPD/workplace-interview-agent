'use client';

import { useRef, useState } from 'react';

async function startRealtimeSession() {
  const response = await fetch('/api/realtime-session', { method: 'POST' });
  const data = await response.json();
  console.log('API response:', data);
  return data.client_secret?.value || data.client_secret;
}

export default function InterviewPage() {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const sessionIdRef = useRef<string>(`session-${Date.now()}`);

  const startInterview = async () => {
    setIsConnecting(true);
    
    try {
      const ephemeralKey = await startRealtimeSession();
      
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioEl = audioRef.current;
      if (!audioEl) throw new Error('Audio element not found');

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

Work Demands and Rewards (5 questions):

Q1. "Overall, I am ____ with my job."
Response scale:
1 - Not at all satisfied
2 - Not too satisfied
3 - Somewhat satisfied
4 - Very satisfied

Q2. "I am given a lot of freedom to decide how to do my own work."
Response scale:
1 - Strongly disagree
2 - Somewhat disagree
3 - Somewhat agree
4 - Strongly agree

Q3. "I never seem to have enough time to get everything done on my job."
Response scale:
1 - Strongly disagree
2 - Somewhat disagree
3 - Somewhat agree
4 - Strongly agree

Q4. "The work I do is meaningful to me."
Response scale:
1 - Strongly disagree
2 - Somewhat disagree
3 - Somewhat agree
4 - Strongly agree

Q5. "My work inspires me."
Response scale:
1 - Never
2 - Almost never (a few times a year or less)
3 - Rarely (once a month or less)
4 - Sometimes (a few times a month)
5 - Often (once a week)
6 - Very often (a few times a week)
7 - Always (every day)

Organizational Support and the Work Environment (6 questions):

Q6. "At my organization, I am treated with respect."
Response scale:
1 - Strongly disagree
2 - Somewhat disagree
3 - Somewhat agree
4 - Strongly agree

Q7. "My organization is willing to extend resources in order to help me perform my job to the best of my ability."
Response scale:
1 - Strongly disagree
2 - Somewhat disagree
3 - Somewhat agree
4 - Strongly agree

Q8. "My organization is committed to employee health and well-being."
Response scale:
1 - Strongly disagree
2 - Somewhat disagree
3 - Somewhat agree
4 - Strongly agree

Q9. "Overall, how safe do you think your workplace is?"
Response scale:
1 - Very unsafe
2 - Somewhat unsafe
3 - Somewhat safe
4 - Very safe

Q10. "Management reacts quickly to solve the problem when told about safety hazards."
Response scale:
1 - Strongly disagree
2 - Somewhat disagree
3 - Somewhat agree
4 - Strongly agree
0 - Does not apply

Q11. "How satisfied are you with the environmental conditions at your workplace (heating, lighting, ventilation, etc.)?"
Response scale:
1 - Very dissatisfied
2 - Somewhat dissatisfied
3 - Somewhat satisfied
4 - Very satisfied

Work-Life Balance and Flexibility (3 questions):

Q12. "How often do the demands of your job interfere with your personal life?"
Response scale:
1 - Never
2 - Almost never (a few times a year or less)
3 - Rarely (once a month or less)
4 - Sometimes (a few times a month)
5 - Often (once a week)
6 - Very often (a few times a week)
7 - Always (every day)

Q13. "How often do the demands of your personal life interfere with your work on the job?"
Response scale:
1 - Never
2 - Almost never (a few times a year or less)
3 - Rarely (once a month or less)
4 - Sometimes (a few times a month)
5 - Often (once a week)
6 - Very often (a few times a week)
7 - Always (every day)

Q14. "I have the freedom to vary my work schedule."
Response scale:
1 - Strongly disagree
2 - Somewhat disagree
3 - Somewhat agree
4 - Strongly agree

Workers' Physical, Psychological, and Occupational Health (6 questions):

Q15. "Would you say that in general, your health is poor, fair, good, very good, or excellent?"
Response scale:
1 - Poor
2 - Fair
3 - Good
4 - Very good
5 - Excellent

Q16. "Now, thinking about your mental health, which includes stress, depression, anxiety, and problems with emotions, during the past 30 days, for how many days was your mental health not good?"
Response: Please answer with a number of days from 0 to 30.

Q17. "How often do you experience stress with regard to your work?"
Response scale:
1 - Never
2 - Almost never (a few times a year or less)
3 - Rarely (once a month or less)
4 - Sometimes (a few times a month)
5 - Often (once a week)
6 - Very often (a few times a week)
7 - Always (every day)

Q18. "Over the last 2 weeks, how often have you been bothered by feeling down, depressed, or hopeless?"
Response scale:
1 - Not at all
2 - Several days
3 - More than half the days
4 - Nearly every day

Q19. "Over the last 2 weeks, how often have you been bothered by feeling nervous, anxious, or on edge?"
Response scale:
1 - Not at all
2 - Several days
3 - More than half the days
4 - Nearly every day

Q20. "In a typical week, how many days do you get at least 20 minutes of high intensity physical activity? High intensity activity lasts at least 10 minutes and increases your heart rate, makes you sweat, and may make you feel out of breath; examples are running, fast cycling, and strenuous, continuous lifting of heavy objects."
Response: Please answer with a number of days from 0 to 7.

Discrimination, Harassment, and Violence (3 questions):

Q21. "I feel discriminated against in my job because of my gender."
Response scale:
1 - Strongly disagree
2 - Somewhat disagree
3 - Somewhat agree
4 - Strongly agree

Q22. "In the past 12 months, were you sexually harassed by anyone while you were on the job?"
Response scale:
1 - Yes
0 - No

Q23. "In the past 12 months, were you bullied, threatened, or harassed in any other way by anyone while you were on the job?"
Response scale:
1 - Yes
0 - No

For each question:
1. Read the statement.
2. Read the full response scale with numbers.
3. Ask the participant to choose the option that best fits their experience.
4. After they answer, ask a brief follow-up like: "What makes you say that?" or "Can you tell me more about that?" or "Can you share an example?"

After finishing the 23 questions, say:
"Thank you for your thoughtful responses so far. I have just five more questions where I'd like to invite you to dream big about your workplace."

Dream Big 1 — Organizational Vision:
"If you could change one thing about your workplace to make it a better place for everyone, what would it be?"

Dream Big 2 — Personal Work Experience:
"What would make your day-to-day work feel more meaningful, motivating, or enjoyable?"

Dream Big 3 — Leadership & Operations:
"If leadership asked for your honest advice on how to improve the workplace, what would you tell them?"

Dream Big 4 — Barriers & Opportunities:
"What is one change—big or small—that would help you do your best work here?"

Dream Big 5 — Future Vision:
"If you imagine this workplace one year from now at its best, what does that look like to you?"

Closing:
When the participant says they are finished, close warmly:
"Thank you so much for sharing your experiences. Your input will help strengthen workplace well-being."

Important behavior rules:
- Never ask for names, emails, or personal contact information.
- Never reveal or summarize prior answers aloud.
- Always state the full rating scale with numbers before EVERY rating question.
- When participants respond, capture both the number and text (e.g., "3 - Somewhat satisfied").
- Keep the conversation moving at a brisk pace, but be respectful and supportive.
- START the conversation immediately with your greeting when the interview begins.`,
            voice: 'alloy',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: { type: 'server_vad' },
          },
        };

        dc.send(JSON.stringify(sessionUpdate));

        setTimeout(() => {
          dc.send(JSON.stringify({ type: 'response.create' }));
        }, 500);
      });

      dc.addEventListener('message', async (e) => {
        const data = JSON.parse(e.data);
        
        if (data.type === 'conversation.item.input_audio_transcription.completed') {
          const transcript = data.transcript;
          await logTranscript('user', transcript);
        }
        
        if (data.type === 'response.audio_transcript.done') {
          const transcript = data.transcript;
          await logTranscript('clarity', transcript);
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
          'Content-Type': 'application/sdp',
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

  const logTranscript = async (speaker: string, transcript: string) => {
    try {
      await fetch('/api/log-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          sessionId: sessionIdRef.current,
          speaker,
          transcript,
        }),
      });
    } catch (error) {
      console.error('Failed to log transcript:', error);
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
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '60px 40px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        textAlign: 'center'
      }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Welcome to the<br />Engaging Workplace<br />Well-Being Interview Experience!
        </h1>
        
        <p style={{
          fontSize: '16px',
          color: '#666',
          marginBottom: '40px',
          lineHeight: '1.6'
        }}>
          When you start, Clarity will guide you through questions about job satisfaction, workload, workplace support, psychological safety, work-life balance, and overall well-being. Your responses are confidential and will be combined with others to support workplace improvement.
        </p>

        {!isActive && !isConnecting && (
          <button
            onClick={startInterview}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '50px',
              padding: '18px 48px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.3s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 15px 40px rgba(102, 126, 234, 0.5)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(102, 126, 234, 0.4)';
            }}
          >
            Start Interview
          </button>
        )}

        {isConnecting && (
          <div style={{
            fontSize: '18px',
            color: '#667eea',
            fontWeight: '600'
          }}>
            Connecting...
          </div>
        )}

        {isActive && (
          <div>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              margin: '0 auto 30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: 'pulse 2s ease-in-out infinite',
            }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'white',
              }} />
            </div>
            
            <p style={{
              fontSize: '18px',
              color: '#667eea',
              marginBottom: '30px',
              fontWeight: '600'
            }}>
              Interview in progress...
            </p>
            
            <button
              onClick={stopInterview}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '50px',
                padding: '14px 40px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#dc2626';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = '#ef4444';
              }}
            >
              Stop Interview
            </button>
          </div>
        )}

        <audio ref={audioRef} autoPlay />
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}

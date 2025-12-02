'use client';

import { useState, useEffect } from 'react';

export default function InterviewPage() {
  const [isActive, setIsActive] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);

  const startInterview = () => {
    setIsActive(true);
    // TODO: Connect to OpenAI Realtime API
    // Simulate the agent asking a question
    setTimeout(() => {
      setTranscript(['Great! Could you please tell me your role at the school? Are you a student, teacher, non-instructional staff, or administrator?']);
    }, 1000);
  };

  const stopInterview = () => {
    setIsActive(false);
    setTranscript([]);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-start p-8">
      {/* Buttons at top */}
      <div className="flex gap-8 mb-16 mt-8">
        <button
          onClick={startInterview}
          disabled={isActive}
          className="px-16 py-6 bg-gradient-to-b from-blue-200 to-blue-400 text-gray-800 text-2xl font-medium rounded-full border-2 border-blue-300 shadow-lg hover:shadow-xl transition disabled:opacity-50"
        >
          Start Interview
        </button>
        <button
          onClick={stopInterview}
          disabled={!isActive}
          className="px-16 py-6 bg-gradient-to-b from-blue-200 to-blue-400 text-gray-800 text-2xl font-medium rounded-full border-2 border-blue-300 shadow-lg hover:shadow-xl transition disabled:opacity-50"
        >
          Stop Interview
        </button>
      </div>

      {/* Pulsing cloud orb */}
      <div className="relative mb-16">
        <div className={`w-96 h-96 rounded-full bg-gradient-to-br from-blue-200 via-blue-300 to-blue-500 ${isActive ? 'animate-pulse' : ''} shadow-2xl`}></div>
      </div>

      {/* Transcript text that appears above progress bar */}
      {isActive && transcript.length > 0 && (
        <div className="max-w-3xl w-full space-y-6">
          {transcript.map((text, idx) => (
            <div key={idx} className="animate-fade-in-up">
              <p className="text-xl text-gray-800 text-center leading-relaxed">
                {text}
              </p>
            </div>
          ))}
          
          {/* User response simulation */}
          <div className="text-xl text-gray-600 text-center italic mt-8">
            I am a student,
          </div>

          {/* Progress bar */}
          <div className="mt-12 mb-8">
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: '35%' }}></div>
            </div>
          </div>

          {/* Follow-up question */}
          <div className="animate-fade-in-up-delayed">
            <p className="text-xl text-gray-700 text-center leading-relaxed">
              Thanks! And could you please provide your school ID number for verification?
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 1s ease-out;
        }
        
        .animate-fade-in-up-delayed {
          animation: fade-in-up 1s ease-out 1.5s both;
        }
      `}</style>
    </div>
  );
}
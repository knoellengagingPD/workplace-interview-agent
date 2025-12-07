export default function Home() {
  return (
    <main style={{ 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        padding: '60px 40px',
        maxWidth: '800px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <h1 style={{
          fontSize: '42px',
          fontWeight: '700',
          marginBottom: '20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textAlign: 'center'
        }}>
          Welcome to the Engaging Workplace Well-Being Interview Experience!
        </h1>
        
        <h2 style={{
          fontSize: '24px',
          fontWeight: '600',
          marginTop: '40px',
          marginBottom: '15px',
          color: '#333'
        }}>
          What to Expect
        </h2>
        
        <p style={{ fontSize: '16px', lineHeight: '1.8', color: '#555', marginBottom: '15px' }}>
          Clarity, our workplace well-being interview agent, will guide you step-by-step through 23 research-based questions about your workplace experience, followed by 5 "Dream Big" questions where you can share your vision for an ideal workplace.
        </p>
        
        <p style={{ fontSize: '16px', lineHeight: '1.8', color: '#555', marginBottom: '15px' }}>
          For each question, Clarity will share the full response scale and you'll choose the option that best fits your experience. After your rating, you'll be asked a brief follow-up so you can share your reasoning or add any context you feel is important.
        </p>
        
        <p style={{ fontSize: '16px', lineHeight: '1.8', color: '#555', marginBottom: '15px' }}>
          You'll respond using your voice, just like a regular conversation.
        </p>
        
        <p style={{ fontSize: '16px', lineHeight: '1.8', color: '#555', marginBottom: '30px' }}>
          The full experience usually takes about 15–20 minutes.
        </p>

        <h2 style={{
          fontSize: '24px',
          fontWeight: '600',
          marginTop: '30px',
          marginBottom: '15px',
          color: '#333'
        }}>
          Tips for a Smooth Interview
        </h2>
        
        <ul style={{ fontSize: '16px', lineHeight: '1.8', color: '#555', marginBottom: '30px', paddingLeft: '20px' }}>
          <li>Find a quiet place so Clarity can hear you clearly.</li>
          <li>Speak naturally—there are no right or wrong answers.</li>
          <li>If you need something repeated, simply ask.</li>
          <li>Feel free to pause and think before you respond.</li>
        </ul>

        <p style={{ fontSize: '16px', lineHeight: '1.8', color: '#555', marginBottom: '40px', fontWeight: '600' }}>
          Your responses are completely confidential and will not be shared with anyone at your workplace—they'll be combined with responses from others to help improve your work experience.
        </p>
        
        <p style={{ fontSize: '16px', lineHeight: '1.8', color: '#555', marginBottom: '40px' }}>
          Thank you for taking a moment to share your voice—it truly makes a difference!
        </p>

        <div style={{ textAlign: 'center' }}>
          <a 
            href="/interview"
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '50px',
              padding: '18px 48px',
              fontSize: '18px',
              fontWeight: '600',
              boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)',
              transition: 'all 0.3s ease',
            }}
          >
            Start Interview →
          </a>
        </div>
      </div>
    </main>
  );
}

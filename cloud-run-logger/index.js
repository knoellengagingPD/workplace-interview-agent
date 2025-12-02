const express = require('express');
const {BigQuery} = require('@google-cloud/bigquery');

const app = express();
app.use(express.json());

const bigquery = new BigQuery({projectId: 'engaging-pd-chatbot'});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({status: 'ok', service: 'clarity-logger', version: '1.1'});
});

// Main logging endpoint
app.post('/', async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  
  // Check API key
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({error: 'Unauthorized'});
  }
  
  try {
    const {timestamp, sessionId, speaker, transcript} = req.body;
    
    await bigquery
      .dataset('clarity_interviews')
      .table('transcripts')
      .insert([{
        timestamp: new Date(timestamp),
        session_id: sessionId,
        speaker,
        transcript
      }]);
    
    res.json({success: true});
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({error: 'Failed to log'});
  }
});

// OPTIONS handler for CORS preflight
app.options('/', (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  res.status(204).send('');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

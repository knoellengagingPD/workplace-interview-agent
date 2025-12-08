import { NextRequest, NextResponse } from 'next/server';
import { BigQuery } from '@google-cloud/bigquery';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { timestamp, sessionId, speaker, transcript } = body;
    
    console.log('📝 Logging transcript directly to BigQuery:', { 
      timestamp, 
      sessionId, 
      speaker,
      transcriptLength: transcript?.length 
    });
    
    // Validate required fields
    if (!timestamp || !sessionId || !speaker || !transcript) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get BigQuery configuration from environment variables
    const projectId = process.env.GCP_PROJECT_ID;
    const datasetId = process.env.BQ_DATASET_ID;
    const tableId = process.env.BQ_TABLE_ID;

    if (!projectId || !datasetId || !tableId) {
      console.error('❌ Missing BigQuery configuration:', {
        hasProject: !!projectId,
        hasDataset: !!datasetId,
        hasTable: !!tableId
      });
      return NextResponse.json(
        { error: 'BigQuery not configured' },
        { status: 500 }
      );
    }

    // Initialize BigQuery client
    const bigquery = new BigQuery({
      projectId: projectId,
      credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
    });

    // Insert row into BigQuery
    const rows = [{
      timestamp,
      session_id: sessionId,
      speaker,
      transcript,
    }];

    console.log('🚀 Inserting into BigQuery:', `${projectId}.${datasetId}.${tableId}`);

    await bigquery
      .dataset(datasetId)
      .table(tableId)
      .insert(rows);

    console.log('✅ Successfully logged to BigQuery');
    
    return NextResponse.json({ 
      success: true,
      inserted: 1
    });
    
  } catch (error: any) {
    console.error('❌ BigQuery logging error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to log transcript',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error.errors || []
      },
      { status: 500 }
    );
  }
}

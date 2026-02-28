import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function setup() {
    try {
        await sql`
      CREATE TABLE IF NOT EXISTS canvases (
        id UUID PRIMARY KEY,
        canvas_data JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
        console.log("Table 'canvases' created successfully.");
    } catch (err) {
        console.error("Error creating table:", err);
        process.exit(1);
    }
}

setup();

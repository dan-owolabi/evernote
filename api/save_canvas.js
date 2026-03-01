import { neon } from '@neondatabase/serverless';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '8mb',
        },
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { id, canvas_data } = req.body;
    if (!id || !canvas_data) {
        return res.status(400).json({ error: 'Missing id or canvas_data' });
    }

    try {
        const sql = neon(process.env.DATABASE_URL);

        // Neon / Postgres UPSERT equivalent
        await sql`
            INSERT INTO canvases (id, canvas_data)
            VALUES (${id}, ${canvas_data})
            ON CONFLICT (id) DO UPDATE 
            SET canvas_data = EXCLUDED.canvas_data
        `;

        return res.status(200).json({ success: true });
    } catch (err) {
        console.error('Error saving canvas:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

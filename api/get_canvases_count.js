import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const sql = neon(process.env.DATABASE_URL);
        const result = await sql`SELECT COUNT(*) FROM canvases`;

        return res.status(200).json({ count: parseInt(result[0].count, 10) });
    } catch (err) {
        console.error('Error counting canvases:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

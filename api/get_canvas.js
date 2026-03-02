import { neon } from '@neondatabase/serverless';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function queryCanvas(sql, id) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    if (isUUID) {
        const data = await sql`SELECT * FROM canvases WHERE id = ${id} LIMIT 1`;
        if (data.length > 0) return data[0];
    }

    const nameData = await sql`
        SELECT * FROM canvases
        WHERE canvas_data->>'name' = ${id}
        LIMIT 1
    `;

    return nameData.length > 0 ? nameData[0] : null;
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing id parameter' });

    const sql = neon(process.env.DATABASE_URL);
    const delays = [0, 2000, 3000]; // immediate, then 2s, then 3s

    for (let i = 0; i < delays.length; i++) {
        if (delays[i] > 0) await sleep(delays[i]);
        try {
            const row = await queryCanvas(sql, id);
            if (row) return res.status(200).json({ data: row });
        } catch (err) {
            console.error(`Canvas fetch attempt ${i + 1} error:`, err);
            if (i === delays.length - 1) {
                return res.status(500).json({ error: 'Internal Server Error' });
            }
        }
    }

    return res.status(404).json({ error: 'Canvas not found' });
}

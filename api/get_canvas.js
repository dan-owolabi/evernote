import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing id parameter' });

    try {
        const sql = neon(process.env.DATABASE_URL);

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        if (isUUID) {
            const data = await sql`SELECT * FROM canvases WHERE id = ${id} LIMIT 1`;
            if (data.length > 0) return res.status(200).json({ data: data[0] });
        }

        // Check if there is a canvas matching the name field
        const nameData = await sql`
            SELECT * FROM canvases 
            WHERE canvas_data->>'name' = ${id}
            LIMIT 1
        `;

        if (nameData.length > 0) return res.status(200).json({ data: nameData[0] });

        return res.status(404).json({ error: 'Canvas not found' });
    } catch (err) {
        console.error('Error fetching canvas:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { candidates } = req.body;
    if (!Array.isArray(candidates) || candidates.length === 0) {
        return res.status(200).json({ taken: [] });
    }

    try {
        const sql = neon(process.env.DATABASE_URL);

        // Check if any of these names exist in canvas_data->>'name' OR id
        // The original code checked 'id', but vanity names are in canvas_data->>'name'.
        // We'll check both just to be safe and compatible.

        // Because candidates is an array, we can use the ANY operator
        const data = await sql`
            SELECT id, canvas_data->>'name' as name 
            FROM canvases 
            WHERE id::text = ANY(${candidates}) 
               OR canvas_data->>'name' = ANY(${candidates})
        `;

        const taken = new Set();
        data.forEach(row => {
            if (row.id) taken.add(row.id.toLowerCase());
            if (row.name) taken.add(row.name.toLowerCase());
        });

        return res.status(200).json({ taken: Array.from(taken) });
    } catch (err) {
        console.error('Error checking names:', err);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

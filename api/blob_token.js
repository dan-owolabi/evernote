import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return res.status(503).json({ error: 'Video storage not configured (BLOB_READ_WRITE_TOKEN missing)' });
    }

    try {
        const body = await handleUpload({
            body: req.body,
            request: req,
            onBeforeGenerateToken: async (pathname) => ({
                allowedContentTypes: [
                    'video/mp4', 'video/webm', 'video/quicktime',
                    'video/mov', 'video/avi', 'video/x-matroska',
                ],
                maximumSizeInBytes: 200 * 1024 * 1024, // 200 MB
            }),
            onUploadCompleted: async ({ blob }) => {
                console.log('Video uploaded to blob:', blob.url);
            },
        });
        return res.status(200).json(body);
    } catch (err) {
        console.error('Blob token error:', err);
        return res.status(400).json({ error: err.message });
    }
}

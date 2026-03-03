// Vercel Serverless Function - Anthropic API Proxy
// API Key is stored securely as a Vercel Environment Variable (ANTHROPIC_API_KEY)
// This keeps the key out of the codebase entirely.

export default async function handler(req, res) {
    // Allow CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API key not configured on server.' });
    }

    try {
        const body = req.body;
        const stream = body.stream || false;

        const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!anthropicRes.ok) {
            const err = await anthropicRes.json().catch(() => ({}));
            return res.status(anthropicRes.status).json(err);
        }

        if (stream) {
            // Stream the response back to the client
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const reader = anthropicRes.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(decoder.decode(value, { stream: true }));
            }
            return res.end();
        } else {
            const data = await anthropicRes.json();
            return res.status(200).json(data);
        }
    } catch (err) {
        console.error('Proxy error:', err);
        return res.status(500).json({ error: err.message });
    }
}

// Vercel Serverless Function - Anthropic API Proxy
// API Key is stored securely as a Vercel Environment Variable (ANTHROPIC_API_KEY)

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API key not configured on server.' });

    try {
        const { system, messages, max_tokens } = req.body;

        // Model is locked server-side - not controlled by client
        const anthropicPayload = {
            model: 'claude-3-haiku-20240307',
            max_tokens: max_tokens || 1000,
            stream: true,
            system,
            messages
        };

        const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify(anthropicPayload)
        });

        if (!anthropicRes.ok) {
            const err = await anthropicRes.json().catch(() => ({}));
            return res.status(anthropicRes.status).json(err);
        }

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

    } catch (err) {
        console.error('Proxy error:', err);
        return res.status(500).json({ error: err.message });
    }
}

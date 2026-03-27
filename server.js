require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.json());

// Serve static files from dashboard/
app.use(express.static(path.join(__dirname, 'dashboard')));

// Mock/Proxy for /api/chat
app.post('/api/chat', async (req, res) => {
    console.log('🍓 Jimmy Chat Request received');
    
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return res.status(200).json({ 
            error: { 
                message: "API key (ANTHROPIC_API_KEY) not found in local environment. Please set it to enable chatbot features." 
            } 
        });
    }

    try {
        const { system, messages, max_tokens } = req.body;
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: max_tokens || 1000,
                stream: true,
                system,
                messages
            })
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            return res.status(response.status).json(errData);
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(decoder.decode(value, { stream: true }));
        }
        return res.end();

    } catch (err) {
        console.error('Chat error:', err);
        return res.status(500).json({ error: { message: err.message } });
    }
});

app.listen(PORT, () => {
    console.log(`🍓 Full Dashboard + API Server running at http://localhost:${PORT}`);
    console.log(`👉 Static files served from: ${path.join(__dirname, 'dashboard')}`);
});

import OpenAI from 'openai';

export async function processContent(content: string): Promise<string> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        console.warn("OPENAI_API_KEY not found in environment variables. Skipping AI processing.");
        return "Skipped AI processing (no API key provided).";
    }

    const openai = new OpenAI({ apiKey });

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a helpful assistant that summarizes web content." },
                { role: "user", content: `Please summarize the following content:\n\n${content.substring(0, 4000)}` }
            ],
        });

        return response.choices[0].message.content || "No summary generated.";
    } catch (error) {
        console.error("Error processing content with OpenAI:", error);
        return "Error processing content.";
    }
}

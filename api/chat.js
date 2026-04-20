import OpenAI from 'openai';

export default async function handler(req, res) {
  // 1. Security: Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 2. Setup DeepSeek Client
  // We use the environment variable DEEPSEEK_API_KEY so the key isn't in the code
  const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY, 
  });

  const { messages } = req.body;

  try {
    // 3. Call the API (DeepSeek-Chat is the fast model)
    const response = await openai.chat.completions.create({
      model: 'deepseek-chat', // This is the fast "Instant" equivalent
      messages: [
        {
          role: 'system',
          content: `You are a helpful running shoe expert for a fictional store called "Stride & Soul". 
                    Keep answers short, punchy, and friendly. 
                    If asked for recommendations, mention specific fake shoe names like "AirFlow Pro" or "TrailBlazer X".`
        },
        ...messages
      ],
      stream: false, // Set to true later if you want streaming (Level 3)
    });

    // 4. Return the result
    res.status(200).json({ reply: response.choices[0].message.content });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong with the AI request.' });
  }
}
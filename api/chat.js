import OpenAI from 'openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY, 
  });

  const { messages } = req.body;

  // The "Brain" - Inventory Context
  const systemPrompt = `
    You are a helpful running shoe expert for a store called "Stride & Soul". 
    You must ONLY recommend shoes that are currently in stock in our inventory list below.
    
    CURRENT INVENTORY:
    1. **Hoka Clifton 9** ($145) - Neutral, max cushion. Great for recovery days and long easy runs.
    2. **Li-Ning Boom! 5 Pro** ($160) - Elite racing shoe. Carbon fiber plate. Very bouncy (BOOM technology). Great for marathons.
    3. **Asics Gel-Kayano 30** ($160) - Stability shoe. Perfect for overpronators or flat feet. Excellent support.
    4. **Brooks Ghost 15** ($140) - Reliable neutral daily trainer. Smooth ride, good for beginners.

    RULES:
    - If a customer asks for a shoe NOT on this list, apologize and suggest the closest match from the list.
    - Keep answers short (2-3 sentences).
    - Use markdown bolding (**) for shoe names to make them pop.
    - Be enthusiastic.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
    });

    res.status(200).json({ reply: response.choices[0].message.content });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong with the AI request.' });
  }
}
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

  // Updated Inventory List
  const systemPrompt = `
    You are a helpful running shoe expert for a store called "Stride & Soul". 
    You must ONLY recommend shoes from the inventory list below.
    
    CURRENT INVENTORY:
    - **Hoka Clifton 9** ($145) - Neutral, max cushion. Great for recovery and easy miles.
    - **Hoka Mach 6** ($150) - Neutral, lighter and faster than Clifton. Good for daily training.
    - **Li-Ning Boom! 5 Pro** ($160) - Elite racing shoe with carbon plate. "BOOM" technology for high energy return.
    - **Li-Ning Arc Ace** ($130) - Stability shoe. Great support for overpronation.
    - **Asics Gel-Kayano 30** ($160) - Stability. Legendary support and comfort for long runs.
    - **Asics Novablast 4** ($140) - Neutral. Very bouncy and energetic, great for faster runs.
    - **Brooks Ghost 15** ($140) - Neutral. Smooth, reliable, great for beginners.
    - **Brooks Adrenaline GTS 23** ($140) - Stability. Classic support shoe, good for flat feet.

    RULES:
    - If a customer asks for a shoe NOT on this list, apologize and suggest the closest match.
    - Keep answers short (3-4 sentences max).
    - Use markdown bolding (**) for shoe names.
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
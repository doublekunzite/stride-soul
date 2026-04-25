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

  // Check if the latest message contains an image
  // We look at the last message from the user
  const lastMessage = messages[messages.length - 1];
  const hasImage = Array.isArray(lastMessage.content) && 
                   lastMessage.content.some(item => item.type === 'image_url');

  // Select Model: Use 'deepseek-vl' for vision, 'deepseek-chat' for text
  const model = hasImage ? 'deepseek-vl' : 'deepseek-chat';

  const systemPrompt = {
    role: 'system',
    content: `You are a helpful running shoe expert for a store called "Stride & Soul". 
    
    CURRENT INVENTORY:
    - **Hoka Clifton 9** ($145) - Neutral, max cushion.
    - **Hoka Mach 6** ($150) - Neutral, lighter and faster.
    - **Li-Ning Boom! 5 Pro** ($160) - Elite racing shoe.
    - **Li-Ning Arc Ace** ($130) - Stability.
    - **Asics Gel-Kayano 30** ($160) - Stability.
    - **Asics Novablast 4** ($140) - Neutral, bouncy.
    - **Brooks Ghost 15** ($140) - Neutral, reliable.
    - **Brooks Adrenaline GTS 23** ($140) - Stability.

    INSTRUCTIONS:
    - If the user uploads an image, identify the shoe brand and model visually.
    - If we have that shoe in stock, mention it.
    - If we don't have that exact shoe, recommend the closest match from our inventory.
    - If no image is provided, answer text questions as normal.
    - Keep answers short (2-4 sentences).`
  };

  try {
    const response = await openai.chat.completions.create({
      model: model, // Dynamic model selection
      messages: [systemPrompt, ...messages],
    });

    res.status(200).json({ reply: response.choices[0].message.content });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Something went wrong with the AI request.' });
  }
}
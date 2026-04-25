// api/chat.js
// IMPORTANT: We are NOT using 'import OpenAI' anymore. We use native fetch.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;
  const apiKey = process.env.DEEPSEEK_API_KEY;

  // System Prompt: Honest ID first, then Sales
  const systemPrompt = {
    role: 'system',
    content: `You are a running shoe expert for "Stride & Soul".

    CRITICAL INSTRUCTION FOR IMAGES:
    1. FIRST, identify the shoe in the image honestly (Brand and Model). Do not guess if you are unsure.
    2. SECOND, check if that specific model is in our inventory list below.
    3. THIRD, if we do NOT have that exact shoe, clearly state "We don't currently stock [Brand Model], but..." and recommend the closest functional alternative from our inventory.

    OUR INVENTORY (We ONLY sell these):
    - **Hoka Clifton 9** ($145) - Neutral, max cushion.
    - **Hoka Mach 6** ($150) - Neutral, lighter and faster.
    - **Li-Ning Boom! 5 Pro** ($160) - Elite racing shoe.
    - **Li-Ning Arc Ace** ($130) - Stability.
    - **Asics Gel-Kayano 30** ($160) - Stability.
    - **Asics Novablast 4** ($140) - Neutral, bouncy.
    - **Brooks Ghost 15** ($140) - Neutral, reliable.
    - **Brooks Adrenaline GTS 23** ($140) - Stability.

    GENERAL RULES:
    - Keep answers short (2-4 sentences).
    - Never claim a shoe is in our inventory if it is not on the list above.`
  };

  // Translation Layer
  // DeepSeek expects images inside the text string using Markdown format, not JSON objects.
  const formattedMessages = messages.map(msg => {
    // If content is an array, it might contain an image
    if (Array.isArray(msg.content)) {
      let textPart = "";
      let imageUrl = "";

      msg.content.forEach(part => {
        if (part.type === 'text') textPart = part.text;
        if (part.type === 'image_url') imageUrl = part.image_url.url;
      });

      // Construct the Markdown string
      const markdownContent = imageUrl 
        ? `![image](${imageUrl})\n${textPart}` 
        : textPart;

      return { role: msg.role, content: markdownContent };
    }
    // Standard text message
    return msg;
  });

  try {
    // Native Fetch Request
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat', 
        messages: [systemPrompt, ...formattedMessages],
        temperature: 0.1
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("DeepSeek API Error:", data);
      return res.status(500).json({ error: data.error?.message || 'API request failed' });
    }

    res.status(200).json({ reply: data.choices[0].message.content });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: 'Something went wrong with the AI request.' });
  }
}
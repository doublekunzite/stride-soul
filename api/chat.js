export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;
  const apiKey = process.env.DEEPSEEK_API_KEY;

  // Define the System Prompt
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
    // We use fetch directly to have full control over the JSON payload
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat', // DeepSeek-V3 is multimodal
        messages: [systemPrompt, ...messages]
      })
    });

    const data = await response.json();

    // Check for API errors
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
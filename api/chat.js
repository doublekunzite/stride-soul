// api/chat.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;
  const apiKey = process.env.DEEPSEEK_API_KEY;

  // 1. DETECT INPUT TYPE
  // Check if the latest message contains an image
  const lastMessage = messages[messages.length - 1];
  const hasImage = Array.isArray(lastMessage.content) && 
                   lastMessage.content.some(item => item.type === 'image_url');

  // 2. SELECT STRATEGY
  let systemPrompt;
  
  if (hasImage) {
    // STRATEGY A: VISION ID (Open & Smart)
    // We give it the inventory list but tell it to identify FIRST, then check.
    systemPrompt = {
      role: 'system',
      content: `You are a world-class sneaker identifier. Your job is to look at an image and identify the exact Brand and Model.

      PROCESS:
      1. Analyze the image visually. Look for logos (N, Swoosh, Stripes), sole shape, and lacing.
      2. Identify the specific Brand and Model (e.g., "New Balance Roav v1").
      3. AFTER identifying, check if that model exists in our Inventory List below.
      
      INVENTORY LIST:
      - Hoka Clifton 9 ($145)
      - Hoka Mach 6 ($150)
      - Li-Ning Boom! 5 Pro ($160)
      - Li-Ning Arc Ace ($130)
      - Asics Gel-Kayano 30 ($160)
      - Asics Novablast 4 ($140)
      - Brooks Ghost 15 ($140)
      - Brooks Adrenaline GTS 23 ($140)

      RESPONSE RULES:
      - If the shoe IS in our inventory: Confirm it and give the price.
      - If the shoe IS NOT in our inventory: State clearly "That is a [Brand Model]. We don't stock that specific model, but..." then recommend the closest match from our list.
      - Keep response short.`
    };
  } else {
    // STRATEGY B: TEXT CHAT (Strict & Helpful)
    // Standard sales bot logic.
    systemPrompt = {
      role: 'system',
      content: `You are a helpful running shoe expert for "Stride & Soul".
      
      You ONLY discuss shoes found in our inventory. If a user asks for a shoe not on this list, apologize and suggest a similar one from our stock.

      INVENTORY:
      - **Hoka Clifton 9** ($145) - Neutral, max cushion.
      - **Hoka Mach 6** ($150) - Neutral, lighter.
      - **Li-Ning Boom! 5 Pro** ($160) - Elite racing.
      - **Li-Ning Arc Ace** ($130) - Stability.
      - **Asics Gel-Kayano 30** ($160) - Stability.
      - **Asics Novablast 4** ($140) - Neutral, bouncy.
      - **Brooks Ghost 15** ($140) - Neutral.
      - **Brooks Adrenaline GTS 23** ($140) - Stability.

      Keep answers short.`
    };
  }

  // 3. TRANSLATION LAYER (DeepSeek Markdown Format)
  const formattedMessages = messages.map(msg => {
    if (Array.isArray(msg.content)) {
      let textPart = "";
      let imageUrl = "";
      msg.content.forEach(part => {
        if (part.type === 'text') textPart = part.text;
        if (part.type === 'image_url') imageUrl = part.image_url.url;
      });
      const markdownContent = imageUrl ? `![image](${imageUrl})\n${textPart}` : textPart;
      return { role: msg.role, content: markdownContent };
    }
    return msg;
  });

  // 4. API CALL
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat', 
        messages: [systemPrompt, ...formattedMessages],
        temperature: 0.1 // Low temp for factual accuracy
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
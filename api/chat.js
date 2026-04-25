// api/chat.js
// IMPORTANT: We are NOT using 'import OpenAI' anymore. We use native fetch.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;
  const apiKey = process.env.DEEPSEEK_API_KEY;

     // System Prompt: Strict Visual Forensics
  const systemPrompt = {
    role: 'system',
    content: `You are a running shoe expert for "Stride & Soul".

    STRICT VISUAL PROTOCOL:
    1. **BRAND DETECTION**: Look for the brand logo on the side, tongue, or heel of the shoe.
       - 'N' logo = New Balance
       - Swoosh = Nike
       - 3 Stripes = Adidas
       - Asics logo = Asics
       - Hoka logo = Hoka
    2. **MODEL HYPOTHESIS**: Only AFTER identifying the brand, look at the midsole shape and upper design to guess the model.
    3. **CONFIDENCE CHECK**: If you are not 100% sure, say "I believe this is a [Brand] [Model], but I am not certain."
    
    INVENTORY CHECK:
    - If the identified shoe IS in our inventory list below, confirm it.
    - If it IS NOT, explicitly state "We do not stock [Brand] [Model]" and suggest the closest alternative from our inventory.

    OUR INVENTORY:
    - **Hoka Clifton 9**, **Hoka Mach 6**
    - **Li-Ning Boom! 5 Pro**, **Li-Ning Arc Ace**
    - **Asics Gel-Kayano 30**, **Asics Novablast 4**
    - **Brooks Ghost 15**, **Brooks Adrenaline GTS 23**

    RULE: Do not hallucinate inventory. Keep it short.`
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
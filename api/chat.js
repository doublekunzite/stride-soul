// api/chat.js
// IMPORTANT: We are NOT using 'import OpenAI' anymore. We use native fetch.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;
  const apiKey = process.env.DEEPSEEK_API_KEY;

   // Refined System Prompt: Enforces "Chain of Thought" for Vision
  const systemPrompt = {
    role: 'system',
    content: `You are a running shoe expert for "Stride & Soul".

    CRITICAL VISUAL ANALYSIS PROTOCOL (For Images):
    When a user uploads an image, you MUST follow these steps internally before answering:
    1.  **Visual Audit:** Describe the specific visual features you see (shape of the sole, logo placement, lacing system, heel counter). Do not output this step to the user.
    2.  **Brand Identification:** Identify the brand based *only* on the logo or distinct design language.
    3.  **Model Hypothesis:** Based on the features, propose a model.
    4.  **Inventory Check:** Compare your hypothesis against OUR INVENTORY below.
    5.  **Final Output:**
        - If the shoe IS in our inventory: Confirm and describe it.
        - If the shoe IS NOT in our inventory: State the identified Brand and Model clearly ("That looks like a [Brand Model]"), then recommend the closest match from our stock.

    OUR INVENTORY (We ONLY sell these):
    - **Hoka Clifton 9** ($145) - Neutral, max cushion, thick midsole.
    - **Hoka Mach 6** ($150) - Neutral, faster, rubberized outsole.
    - **Li-Ning Boom! 5 Pro** ($160) - Racing, carbon plate, bright colors.
    - **Li-Ning Arc Ace** ($130) - Stability, structured heel.
    - **Asics Gel-Kayano 30** ($160) - Stability, classic Asics stripes.
    - **Asics Novablast 4** ($140) - Neutral, trampoline sole.
    - **Brooks Ghost 15** ($140) - Neutral, segmented crash pad.
    - **Brooks Adrenaline GTS 23** ($140) - Stability, GuideRails.

    RULES:
    - Never guess a model just to be helpful. If unsure, describe the shoe and say "I can't identify the exact model, but..."
    - Keep answers short.`
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
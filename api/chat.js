// api/chat.js

// Helper function to call DeepSeek API
async function callDeepSeek(messages, temperature = 0.1) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat', 
      messages: messages,
      temperature: temperature
    })
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("DeepSeek API Error:", data);
    throw new Error(data.error?.message || 'API request failed');
  }
  return data.choices[0].message.content;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  // 1. DETECT INPUT TYPE
  const lastMessage = messages[messages.length - 1];
  const hasImage = Array.isArray(lastMessage.content) && 
                   lastMessage.content.some(item => item.type === 'image_url');

  try {
    let finalReply = "";

    if (hasImage) {
      // --- STRATEGY: TWO-STEP AGENT ---

      // TRANSLATION LAYER for Step 1
      // Convert the user's message (image + text) into Markdown format for DeepSeek
      const formattedContent = lastMessage.content.map(part => {
        if (part.type === 'text') return part.text;
        if (part.type === 'image_url') return `![image](${part.image_url.url})`;
        return "";
      }).join('\n');

      // STEP 1: The "Eye" - Identify the shoe without inventory bias
      const visionPrompt = [
        { 
          role: 'system', 
          content: "You are a visual identification expert. Identify the specific Brand and Model of the shoe in the image. Return ONLY the Brand and Model name (e.g., 'New Balance 574', 'Nike Air Max 90'). If you are unsure, provide your best guess." 
        },
        { 
          role: 'user', 
          content: `What shoe is in this image? ${formattedContent}` 
        }
      ];

      // Call 1
      const identifiedShoe = await callDeepSeek(visionPrompt, 0.1);
      console.log("Identified Shoe:", identifiedShoe); // Log for debugging

      // STEP 2: The "Brain" - Compare with inventory and generate response
      const salesPrompt = [
        { 
          role: 'system', 
          content: `You are a sales assistant for "Stride & Soul". 
          An image recognition tool identified a customer's shoe as: "${identifiedShoe}".

          OUR INVENTORY:
          - **Hoka Clifton 9** ($145)
          - **Hoka Mach 6** ($150)
          - **Li-Ning Boom! 5 Pro** ($160)
          - **Li-Ning Arc Ace** ($130)
          - **Asics Gel-Kayano 30** ($160)
          - **Asics Novablast 4** ($140)
          - **Brooks Ghost 15** ($140)
          - **Brooks Adrenaline GTS 23** ($140)

          RULES:
          1. If the identified shoe IS in our inventory: Confirm it and give the price.
          2. If the identified shoe IS NOT in our inventory: State "We don't currently stock [Identified Shoe], but..." and recommend the closest match from our inventory.
          3. Keep answers short (2-3 sentences).`
        },
        { 
          role: 'user', 
          content: `The tool identified the shoe as: "${identifiedShoe}". What should I tell the customer?` 
        }
      ];

      // Call 2
      finalReply = await callDeepSeek(salesPrompt, 0.1);

    } else {
      // --- STRATEGY: TEXT ONLY ---

      const textPrompt = [
        { 
          role: 'system', 
          content: `You are a helpful running shoe expert for "Stride & Soul".
          You ONLY discuss shoes found in our inventory.

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
        },
        ...messages
      ];

      finalReply = await callDeepSeek(textPrompt, 0.1);
    }

    res.status(200).json({ reply: finalReply });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message || 'Something went wrong.' });
  }
}
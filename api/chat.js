// api/chat.js

// --- HELPER: Call DeepSeek (Text) ---
async function callDeepSeek(messages) {
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
      temperature: 0.1
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message);
  return data.choices[0].message.content;
}

// --- HELPER: Call Hugging Face (Vision) ---
async function callHuggingFaceVision(base64Image) {
  const apiKey = process.env.HF_TOKEN; 

  // Verified Public Model URL
  const modelUrl = "https://api-inference.huggingface.co/models/vi-t-g/vit-gpt2-coco-demo";

  // Clean base64 data
  const base64Data = base64Image.split(',')[1];

  const body = {
    inputs: base64Data
  };

  const response = await fetch(modelUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  // Read text first to avoid JSON parse crash
  const resultText = await response.text();

  if (!response.ok) {
    console.error("Hugging Face Error Response:", resultText);
    throw new Error("Vision API failed. Check logs for details.");
  }
  
  // Parse the text to JSON
  try {
    const data = JSON.parse(resultText);
    
    // This model returns an array like: [{ "generated_text": "a shoe..." }]
    if (Array.isArray(data) && data[0]?.generated_text) {
      return data[0].generated_text;
    } else {
      // Fallback
      return JSON.stringify(data); 
    }
  } catch (e) {
    console.error("JSON Parse Error:", e);
    throw new Error("Failed to parse Vision response.");
  }
}

// --- MAIN HANDLER ---
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;
  const lastMessage = messages[messages.length - 1];
  const hasImage = Array.isArray(lastMessage.content) && 
                   lastMessage.content.some(item => item.type === 'image_url');

  try {
    let finalReply = "";

    if (hasImage) {
      // --- HYBRID LOGIC ---

      // 1. Extract Image Data
      const imagePart = lastMessage.content.find(item => item.type === 'image_url');
      const imageUrl = imagePart.image_url.url;
      
      console.log("Step 1: Sending image to Hugging Face...");
      // 2. STEP 1: Use HF to Identify (The Eye)
      const identifiedShoe = await callHuggingFaceVision(imageUrl);
      console.log("Identified:", identifiedShoe);

      // 3. STEP 2: Use DeepSeek to Sell (The Brain)
      console.log("Step 2: Checking inventory with DeepSeek...");
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

      finalReply = await callDeepSeek(salesPrompt);

    } else {
      // --- TEXT ONLY LOGIC ---
      const textPrompt = [
        { 
          role: 'system', 
          content: `You are a helpful running shoe expert for "Stride & Soul".
          You ONLY discuss shoes found in our inventory.

          INVENTORY:
          - **Hoka Clifton 9** ($145)
          - **Hoka Mach 6** ($150)
          - **Li-Ning Boom! 5 Pro** ($160)
          - **Li-Ning Arc Ace** ($130)
          - **Asics Gel-Kayano 30** ($160)
          - **Asics Novablast 4** ($140)
          - **Brooks Ghost 15** ($140)
          - **Brooks Adrenaline GTS 23** ($140)

          Keep answers short.`
        },
        ...messages
      ];
      finalReply = await callDeepSeek(textPrompt);
    }

    res.status(200).json({ reply: finalReply });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message || 'Something went wrong.' });
  }
}
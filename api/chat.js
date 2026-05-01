// api/chat.js
import shoes from '../data.json' assert { type: 'json' };

// --- RAG LOGIC: The "Retrieval" Step ---
function retrieveContext(userMessage) {
  let context = "";
  const msg = userMessage.toLowerCase();

  // Helper to format a shoe object into a readable string for the AI
  const formatShoe = (s) => 
    `Model: ${s.name}
Brand: ${s.brand}
Price: $${s.price}
Weight: ${s.weight_grams}g (Men's Size 9)
Type: ${s.type}
Cushion: ${s.cushion}
Details: ${s.description}`;

  // 1. Intent: Lightest Shoe
  if (msg.includes("lightest") || msg.includes("light weight")) {
    const lightest = [...shoes].sort((a, b) => a.weight_grams - b.weight_grams).slice(0, 3);
    context = "The user is looking for the lightest shoes. Here are the top 3 lightest options:\n\n" + 
      lightest.map(formatShoe).join("\n\n");
  } 
  // 2. Intent: Stability / Overpronation
  else if (msg.includes("stability") || msg.includes("flat feet") || msg.includes("overpronat")) {
    const results = shoes.filter(s => s.type === "Stability");
    context = "The user needs stability shoes. Here are the relevant options:\n\n" + 
      results.map(formatShoe).join("\n\n");
  }
  // 3. Intent: Brand Specific
  else if (msg.includes("hoka")) {
    const results = shoes.filter(s => s.brand === "Hoka");
    context = "Here are the Hoka models in stock:\n\n" + results.map(formatShoe).join("\n\n");
  }
  else if (msg.includes("asics")) {
    const results = shoes.filter(s => s.brand === "Asics");
    context = "Here are the Asics models in stock:\n\n" + results.map(formatShoe).join("\n\n");
  }
  else if (msg.includes("brooks")) {
    const results = shoes.filter(s => s.brand === "Brooks");
    context = "Here are the Brooks models in stock:\n\n" + results.map(formatShoe).join("\n\n");
  }
  else if (msg.includes("li-ning") || msg.includes("lining")) {
    const results = shoes.filter(s => s.brand === "Li-Ning");
    context = "Here are the Li-Ning models in stock:\n\n" + results.map(formatShoe).join("\n\n");
  }
  // 4. Default: Just names and prices (for general queries)
  else {
    context = "Here is our current inventory summary:\n" + 
      shoes.map(s => `- ${s.name} ($${s.price})`).join("\n");
  }

  return context;
}

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

// --- MAIN HANDLER ---
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;
  const lastMessage = messages[messages.length - 1];
  const userText = lastMessage.content;

  try {
    // RAG STEP 1: Retrieve Context
    const contextData = retrieveContext(userText);

    // RAG STEP 2: Augment Prompt
    const systemPrompt = {
      role: 'system',
      content: `You are a helpful running shoe expert for "Stride & Soul".
      
      Use the following DATA to answer the user's question. If the answer is not in the DATA, say you don't know.
      
      DATA:
      ${contextData}
      
      Keep answers short and friendly.`
    };

    const responseMessages = [systemPrompt, ...messages];
    
    const reply = await callDeepSeek(responseMessages);

    res.status(200).json({ reply: reply });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message || 'Something went wrong.' });
  }
}
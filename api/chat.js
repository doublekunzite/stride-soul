// api/chat.js

// --- DATA SOURCE (Hardcoded for Vercel Stability) ---
// We put the data directly here to avoid "Module not found" or import crashes.
const shoes = [
  { id: 1, name: "Hoka Clifton 9", brand: "Hoka", price: 145, weight_grams: 248, type: "Neutral", cushion: "High", description: "A highly cushioned daily trainer that delivers a soft, balanced ride for easy miles and long runs." },
  { id: 2, name: "Hoka Mach 6", brand: "Hoka", price: 140, weight_grams: 232, type: "Neutral", cushion: "Responsive", description: "A responsive, low-profile neutral trainer built for tempo runs and faster daily efforts." },
  { id: 3, name: "Li-Ning Challenger 5", brand: "Li-Ning", price: 160, weight_grams: 210, type: "Racing", cushion: "High", description: "An elite carbon-plated racing shoe designed for speed with Boom foam technology." },
  { id: 4, name: "Li-Ning Arc Ace", brand: "Li-Ning", price: 130, weight_grams: 280, type: "Stability", cushion: "Medium", description: "A stability-oriented shoe built on Li-Ning's Arc cushion platform." },
  { id: 5, name: "Asics Gel-Kayano 30", brand: "Asics", price: 160, weight_grams: 303, type: "Stability", cushion: "High", description: "The flagship stability trainer renowned for its plush, supportive ride." },
  { id: 6, name: "Asics Novablast 4", brand: "Asics", price: 140, weight_grams: 260, type: "Neutral", cushion: "High", description: "A bouncy, energetic neutral daily trainer with a trampoline-inspired midsole." },
  { id: 7, name: "Brooks Ghost 15", brand: "Brooks", price: 140, weight_grams: 260, type: "Neutral", cushion: "Medium", description: "A dependable, no-fuss neutral trainer and an ideal entry point for new runners." },
  { id: 8, name: "Brooks Adrenaline GTS 23", brand: "Brooks", price: 140, weight_grams: 286, type: "Stability", cushion: "Medium", description: "A classic stability shoe that pairs GuideRails support with a balanced ride." }
];

// --- RAG LOGIC ---
function retrieveContext(userMessage) {
  let context = "";
  const msg = userMessage.toLowerCase();

  // Helper to format a shoe object
  const formatShoe = (s) => 
    `Model: ${s.name}\nBrand: ${s.brand}\nPrice: $${s.price}\nWeight: ${s.weight_grams}g\nType: ${s.type}\nDetails: ${s.description}`;

  // 1. Intent: Lightest Shoe
  if (msg.includes("lightest") || msg.includes("light weight")) {
    const lightest = [...shoes].sort((a, b) => a.weight_grams - b.weight_grams).slice(0, 3);
    context = "The user is looking for the lightest shoes. Here are the top 3 lightest options:\n\n" + 
      lightest.map(formatShoe).join("\n\n");
  } 
  // 2. Intent: Stability / Flat Feet
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
  
    // 3.5 Intent: Budget Specific
  else if (msg.includes("$") || msg.includes("budget") || msg.includes("cheap") || msg.includes("afford")) {
    // Simple logic: find shoes $145 or less
    const results = shoes.filter(s => s.price <= 145);
    context = "The user is on a budget. Here are shoes under $145:\n\n" + 
      results.map(formatShoe).join("\n\n");
  }
  
  // 4. Default
  else {
    context = "Here is our current inventory summary:\n" + 
      shoes.map(s => `- ${s.name} ($${s.price})`).join("\n");
  }

  return context;
}

// --- HELPER: Call DeepSeek ---
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

  try {
    const { messages } = req.body;
    const lastMessage = messages[messages.length - 1];
    const userText = lastMessage.content;

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
// api/chat.js

// --- DATA SOURCE (Strictly Our Inventory) ---
const inventory = [
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

  // Helper to format data
  const formatFull = (s) => 
    `Model: ${s.name}\nBrand: ${s.brand}\nPrice: $${s.price}\nWeight: ${s.weight_grams}g\nType: ${s.type}\nDetails: ${s.description}`;
  
  const formatDescription = (s) => 
    `Model: ${s.name} (${s.type})\nDetails: ${s.description}`;

  // 1. Intent: Specs (Weight/Price)
  if (msg.includes("lightest") || msg.includes("heaviest") || msg.includes("weight") || msg.includes("gram") || msg.includes("spec")) {
    const sorted = [...inventory].sort((a, b) => a.weight_grams - b.weight_grams);
    const lightest = sorted.slice(0, 3);
    const heaviest = sorted.slice(-3).reverse();
    context = "User wants TECHNICAL SPECS. Here is the data:\n\n" + 
      "LIGHTEST:\n" + lightest.map(formatFull).join("\n\n") + 
      "\n\nHEAVIEST:\n" + heaviest.map(formatFull).join("\n\n");
  } 
  // 2. Intent: Budget
  else if (msg.includes("$") || msg.includes("price") || msg.includes("budget") || msg.includes("afford") || msg.includes("cheap")) {
    const sorted = [...inventory].sort((a, b) => a.price - b.price);
    context = "User cares about PRICE. Sort by price:\n\n" + sorted.map(formatFull).join("\n\n");
  }
  // 3. Intent: Stability / Flat Feet
  else if (msg.includes("stability") || msg.includes("flat feet") || msg.includes("overpronat")) {
    const results = inventory.filter(s => s.type === "Stability");
    context = "User needs STABILITY support. Focus on description:\n\n" + results.map(formatDescription).join("\n\n");
  }
  // 4. Brand Mention
  else if (msg.includes("hoka")) {
    const results = inventory.filter(s => s.brand === "Hoka");
    context = "Hoka models in stock:\n\n" + results.map(formatFull).join("\n\n");
  }
  else if (msg.includes("asics")) {
    const results = inventory.filter(s => s.brand === "Asics");
    context = "Asics models in stock:\n\n" + results.map(formatFull).join("\n\n");
  }
  else if (msg.includes("brooks")) {
    const results = inventory.filter(s => s.brand === "Brooks");
    context = "Brooks models in stock:\n\n" + results.map(formatFull).join("\n\n");
  }
  else if (msg.includes("li-ning") || msg.includes("lining")) {
    const results = inventory.filter(s => s.brand === "Li-Ning");
    context = "Li-Ning models in stock:\n\n" + results.map(formatFull).join("\n\n");
  }
  // 5. Default: Just list names
  else {
    context = "Here is a summary of our inventory:\n" + 
      inventory.map(s => `- ${s.name} ($${s.price})`).join("\n");
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

    const contextData = retrieveContext(userText);

    // STRICT PROMPT
    const systemPrompt = {
      role: 'system',
      content: `You are a salesperson for "Stride & Soul". You MUST follow these rules:

      1. GROUNDING: You can ONLY recommend shoes found in the "INVENTORY DATA" below.
      2. OFF-LIST RESTRICTION: If the user asks for a shoe NOT in the data (like Nike or Saucony), you MUST say: "We don't currently stock [Brand], but..." and then recommend the closest match from our inventory.
      3. NATURAL LANGUAGE: Do not mention weight or price unless the user specifically asks about specs, budget, or "lightest".
      4. TONE: Be helpful and concise.

      INVENTORY DATA:
      ${contextData}`
    };

    const responseMessages = [systemPrompt, ...messages];
    
    const reply = await callDeepSeek(responseMessages);

    res.status(200).json({ reply: reply });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message || 'Something went wrong.' });
  }
}
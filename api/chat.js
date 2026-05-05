// api/chat.js

// --- DATA SOURCE ---

// 1. OUR INVENTORY (Updated Name)
const inventory = [
  { id: 1, name: "Urban Runner", brand: "Stride & Soul", price: 120, weight_grams: 280, type: "Neutral", cushion: "Medium", description: "A versatile daily trainer suitable for road running and casual wear." },
  { id: 2, name: "Classic Vegan Leather", brand: "Stride & Soul", price: 150, weight_grams: 320, type: "Lifestyle", cushion: "Medium", description: "A retro-inspired sneaker crafted with premium vegan leather alternatives for style and animal-friendly comfort." },
  { id: 3, name: "Trail Blazer", brand: "Stride & Soul", price: 135, weight_grams: 300, type: "Trail", cushion: "High", description: "Rugged outsole and deep lugs designed for off-road adventures." },
  { id: 4, name: "Midnight Sneak", brand: "Stride & Soul", price: 110, weight_grams: 210, type: "Racing", cushion: "Responsive", description: "A lightweight, sleek sneaker for speed workouts and fast days." },
  { id: 5, name: "Cloud Walker", brand: "Stride & Soul", price: 140, weight_grams: 260, type: "Neutral", cushion: "High", description: "Plush cushioning makes this ideal for recovery days and long walks." },
  { id: 6, name: "Retro Wave", brand: "Stride & Soul", price: 125, weight_grams: 295, type: "Stability", cushion: "Medium", description: "A supportive stability shoe with a classic 90s aesthetic." }
];

// 2. MARKET KNOWLEDGE (Real World Brands)
const marketKnowledge = [
  { name: "Nike Pegasus 41", type: "Neutral", description: "Dependable neutral workhorse for everyday training." },
  { name: "Hoka Clifton 9", type: "Neutral", description: "Highly cushioned daily trainer with a meta-rocker design." },
  { name: "Brooks Ghost 15", type: "Neutral", description: "Award-winning neutral trainer with soft cushioning." }
];

// 3. SUSTAINABILITY KNOWLEDGE (New)
const sustainabilityKnowledge = `
  - Materials: We are transitioning 80% of our line to use recycled polyester and bio-based foams.
  - Laces: Made from post-consumer plastic.
  - Insoles: Utilize algae bloom foam.
  - Shipping: 100% Carbon Neutral.
  - Packaging: 100% recyclable and plastic-free.
  - Products: The 'Classic Vegan Leather' uses high-quality vegan leather alternatives.
`;

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
      temperature: 0.5 
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message);
  return data.choices[0].message.content;
}

// --- LOGIC TREE: Intent Detection ---
function detectIntent(userMessage) {
  const msg = userMessage.toLowerCase();

  // NEW: Sustainability Detection
  if (msg.includes("sustainable") || msg.includes("sustainability") || msg.includes("eco") || msg.includes("environment") || msg.includes("green")) {
    return "SUSTAINABILITY";
  }

  // Competitor Detection
  const isCompetitorMention = marketKnowledge.some(s => 
    msg.includes(s.name.toLowerCase()) || msg.includes(s.name.toLowerCase().split(" ")[1])
  );
  const isComparison = msg.includes("similar") || msg.includes("alternative") || msg.includes("like the") || msg.includes("equivalent");

  if (isCompetitorMention || isComparison) {
    return "COMPETITOR_QUESTION";
  }

  // Standard Inventory Intents
  if (msg.includes("lightest") || msg.includes("heaviest") || msg.includes("weight")) return "SPECS";
  if (msg.includes("$") || msg.includes("price") || msg.includes("budget")) return "BUDGET";
  if (msg.includes("stability") || msg.includes("flat feet") || msg.includes("support")) return "STABILITY";
  if (msg.includes("vegan") || msg.includes("leather")) return "INVENTORY"; // Catches specific product questions
  
  return "INVENTORY";
}

// --- HANDLER 1: Sustainability (New) ---
async function handleSustainabilityQuestion(userMessage) {
  const systemPrompt = {
    role: 'system',
    content: `You are a representative for 'Stride & Soul'.
    Answer the user's question about sustainability using the data below.
    Be encouraging and highlight our commitment to the planet.
    
    DATA:
    ${sustainabilityKnowledge}
    
    INVENTORY CONTEXT:
    ${inventory.map(s => `- ${s.name}`).join(", ")}
    `
  };
  return await callDeepSeek([systemPrompt, { role: 'user', content: userMessage }]);
}

// --- HANDLER 2: Competitor Logic ---
async function handleCompetitorQuestion(userMessage) {
  const msg = userMessage.toLowerCase();
  const foundShoe = marketKnowledge.find(s => 
    msg.includes(s.name.toLowerCase()) || msg.includes(s.name.toLowerCase().split(" ")[1])
  );

  let context = "";
  if (foundShoe) {
    context = `You asked about the ${foundShoe.name}. 
    KNOWLEDGE: ${foundShoe.description}.
    STATUS: We do NOT sell this brand.
    OUR INVENTORY: ${inventory.map(s => s.name).join(", ")}.`;
  } else {
    context = `User wants a recommendation similar to a popular model.
    OUR INVENTORY: ${inventory.map(s => `${s.name} (${s.type})`).join(", ")}.`;
  }

  const systemPrompt = {
    role: 'system',
    content: `You are a helpful, casual running shoe expert.
    INSTRUCTIONS:
    Answer naturally.
    1. Describe the shoe they asked about (positive tone).
    2. Mention it's not in stock.
    3. Recommend the closest match from OUR INVENTORY.
    DATA: ${context}`
  };
  return await callDeepSeek([systemPrompt, { role: 'user', content: userMessage }]);
}

// --- HANDLER 3: Inventory Logic ---
async function handleInventoryQuestion(intent, userMessage) {
  let contextData = "";
  const formatFull = (s) => `Model: ${s.name}\nBrand: ${s.brand}\nPrice: $${s.price}\nWeight: ${s.weight_grams}g\nType: ${s.type}\nDetails: ${s.description}`;

  if (intent === "SPECS") {
    const sorted = [...inventory].sort((a, b) => a.weight_grams - b.weight_grams);
    contextData = "User wants SPECS. Lightest:\n" + sorted.slice(0, 3).map(formatFull).join("\n\n");
  } else if (intent === "BUDGET") {
    const sorted = [...inventory].sort((a, b) => a.price - b.price);
    contextData = "User cares about PRICE. Cheapest first:\n" + sorted.map(formatFull).join("\n\n");
  } else if (intent === "STABILITY") {
    const results = inventory.filter(s => s.type === "Stability");
    contextData = "User needs STABILITY:\n" + results.map(formatFull).join("\n\n");
  } else {
    contextData = "Our Inventory:\n" + inventory.map(s => `- ${s.name} ($${s.price})`).join("\n");
  }

  const systemPrompt = {
    role: 'system',
    content: `You are a salesperson for "Stride & Soul".
    RULES:
    1. Use ONLY the data below.
    2. Be concise.
    3. Do NOT mention price/weight unless specifically asked (Intent: ${intent}).
    DATA: ${contextData}`
  };
  return await callDeepSeek([systemPrompt, { role: 'user', content: userMessage }]);
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

    const intent = detectIntent(userText);
    console.log("Detected Intent:", intent);

    let reply;
    if (intent === "SUSTAINABILITY") {
      reply = await handleSustainabilityQuestion(userText);
    } else if (intent === "COMPETITOR_QUESTION") {
      reply = await handleCompetitorQuestion(userText);
    } else {
      reply = await handleInventoryQuestion(intent, userText);
    }

    res.status(200).json({ reply: reply });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message || 'Something went wrong.' });
  }
}
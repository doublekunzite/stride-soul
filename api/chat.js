// api/chat.js

// --- DATA SOURCE ---

// 1. OUR INVENTORY (What we SELL - has Price & Weight)
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

// 2. MARKET KNOWLEDGE (What we KNOW ABOUT - No price/weight)
const marketKnowledge = [
  { name: "Adidas Adizero Evo SL", type: "Performance", description: "A lightweight, plate-free performance trainer with a springy Lightstrike Pro midsole." },
  { name: "Brooks Ghost 17", type: "Neutral", description: "Award-winning neutral trainer with DNA Loft v3 cushioning, great for beginners." },
  { name: "Asics Novablast 5", type: "Neutral", description: "Versatile daily trainer with a bouncy midsole, good for building a rotation." },
  { name: "Nike Vomero Plus", type: "Neutral", description: "Max-cushioned trainer with ZoomX midsole for energetic comfort." },
  { name: "New Balance Ellipse", type: "Neutral", description: "A 'Goldilocks' trainer blending soft cushioning with performance feel." },
  { name: "Saucony Ride 19", type: "Neutral", description: "Well-balanced trainer with an 8mm drop for smooth transitions." },
  { name: "Hoka Bondi 9", type: "Neutral", description: "Max-cushioned road shoe, great for recovery days." },
  { name: "Brooks Glycerin 23", type: "Neutral", description: "Popular cushioned shoe ideal for long walks and recovery sessions." },
  { name: "Asics Gel-Kayano 32", type: "Stability", description: "Latest version of the gold-standard stability trainer." },
  { name: "Nike Pegasus 41", type: "Neutral", description: "Dependable neutral workhorse for everyday training." }
];

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

  // DETECTOR: Is the user asking about a competitor?
  // We check if any market shoe name is in the message
  const isCompetitorMention = marketKnowledge.some(s => 
    msg.includes(s.name.toLowerCase()) || msg.includes(s.name.toLowerCase().split(" ")[1]) // matches "Pegasus" or "Nike Pegasus"
  );

  // DETECTOR: Is the user asking for a comparison or alternative?
  const isComparison = msg.includes("similar") || msg.includes("alternative") || msg.includes("like the") || msg.includes("equivalent");

  if (isCompetitorMention || isComparison) {
    return "COMPETITOR_QUESTION";
  }

  // Standard Inventory Intents
  if (msg.includes("lightest") || msg.includes("heaviest") || msg.includes("weight")) return "SPECS";
  if (msg.includes("$") || msg.includes("price") || msg.includes("budget")) return "BUDGET";
  if (msg.includes("stability") || msg.includes("flat feet")) return "STABILITY";
  
  // Default
  return "INVENTORY";
}

// --- LOGIC TREE: Response Generation ---

// HANDLER 1: Competitor Logic (The complex one)
async function handleCompetitorQuestion(userMessage) {
  const msg = userMessage.toLowerCase();
  
  // 1. Find the specific competitor shoe mentioned
  const foundShoe = marketKnowledge.find(s => 
    msg.includes(s.name.toLowerCase()) || msg.includes(s.name.toLowerCase().split(" ")[1])
  );

  // 2. Construct the specific "Competitor Prompt"
  let context = "";
  
  if (foundShoe) {
    context = `You asked about the ${foundShoe.name}. 
    KNOWLEDGE: ${foundShoe.description}.
    STATUS: We do NOT sell this shoe.
    OUR INVENTORY: ${inventory.map(s => s.name).join(", ")}.`;
  } else {
    context = `User wants a recommendation similar to a popular model.
    OUR INVENTORY: ${inventory.map(s => `${s.name} (${s.type})`).join(", ")}.`;
  }

  const systemPrompt = {
    role: 'system',
    content: `You are a helpful expert. Follow this EXACT 3-STEP LOGIC:
    1. ACKNOWLEDGE: Describe the shoe the user asked about using the KNOWLEDGE provided.
    2. CLARIFY: State clearly that "We don't currently stock the [Shoe Name]..."
    3. PIVOT: "...but based on your interest, I recommend the [Our Shoe Name]." Pick the best match from OUR INVENTORY.
    
    DATA:
    ${context}`
  };

  return await callDeepSeek([systemPrompt, { role: 'user', content: userMessage }]);
}

// HANDLER 2: Inventory Logic (The standard one)
async function handleInventoryQuestion(intent, userMessage) {
  const msg = userMessage.toLowerCase();
  let contextData = "";

  // Helper formatting
  const formatFull = (s) => `Model: ${s.name}\nBrand: ${s.brand}\nPrice: $${s.price}\nWeight: ${s.weight_grams}g\nType: ${s.type}\nDetails: ${s.description}`;
  const formatDesc = (s) => `Model: ${s.name}\nType: ${s.type}\nDetails: ${s.description}`;

  // Context Retrieval
  if (intent === "SPECS") {
    const sorted = [...inventory].sort((a, b) => a.weight_grams - b.weight_grams);
    contextData = "User wants SPECS. Lightest:\n" + sorted.slice(0, 3).map(formatFull).join("\n\n");
  } else if (intent === "BUDGET") {
    const sorted = [...inventory].sort((a, b) => a.price - b.price);
    contextData = "User cares about PRICE. Cheapest first:\n" + sorted.map(formatFull).join("\n\n");
  } else if (intent === "STABILITY") {
    const results = inventory.filter(s => s.type === "Stability");
    contextData = "User needs STABILITY:\n" + results.map(formatDesc).join("\n\n");
  } else {
    // Default
    contextData = "Our Inventory:\n" + inventory.map(s => `- ${s.name} ($${s.price})`).join("\n");
  }

  const systemPrompt = {
    role: 'system',
    content: `You are a salesperson for "Stride & Soul".
    RULES:
    1. Use ONLY the data below.
    2. Be concise.
    3. Do NOT mention price/weight unless specifically asked (Intent: ${intent}).
    
    DATA:
    ${contextData}`
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

    // 1. DETECT INTENT
    const intent = detectIntent(userText);
    console.log("Detected Intent:", intent);

    // 2. ROUTE TO CORRECT HANDLER
    let reply;
    if (intent === "COMPETITOR_QUESTION") {
      console.log("Routing to Competitor Handler...");
      reply = await handleCompetitorQuestion(userText);
    } else {
      console.log("Routing to Inventory Handler...");
      reply = await handleInventoryQuestion(intent, userText);
    }

    res.status(200).json({ reply: reply });

  } catch (error) {
    console.error("Server Error:", error);
    res.status(500).json({ error: error.message || 'Something went wrong.' });
  }
}
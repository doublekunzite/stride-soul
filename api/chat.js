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

// --- RAG LOGIC ---
function retrieveContext(userMessage) {
  let context = "";
  const msg = userMessage.toLowerCase();

  // Helpers
  const formatInventory = (s) => 
    `Model: ${s.name}\nBrand: ${s.brand}\nPrice: $${s.price}\nWeight: ${s.weight_grams}g\nType: ${s.type}\nDetails: ${s.description}`;
  
  const formatKnowledge = (s) => 
    `Model: ${s.name} (${s.type})\nDetails: ${s.description}`;

  const formatDescriptionOnly = (s) => 
    `Model: ${s.name} (${s.type})\nDetails: ${s.description}`;

  // 1. Intent: Specs (Weight/Price)
  if (msg.includes("lightest") || msg.includes("heaviest") || msg.includes("weight") || msg.includes("gram") || msg.includes("spec")) {
    const sorted = [...inventory].sort((a, b) => a.weight_grams - b.weight_grams);
    const lightest = sorted.slice(0, 3);
    const heaviest = sorted.slice(-3).reverse();
    context = "User wants TECHNICAL SPECS. Here is the data:\n\n" + 
      "LIGHTEST:\n" + lightest.map(formatInventory).join("\n\n") + 
      "\n\nHEAVIEST:\n" + heaviest.map(formatInventory).join("\n\n");
  } 
  // 2. Intent: Budget
  else if (msg.includes("$") || msg.includes("price") || msg.includes("budget") || msg.includes("afford") || msg.includes("cheap")) {
    const sorted = [...inventory].sort((a, b) => a.price - b.price);
    context = "User cares about PRICE. Sort by price:\n\n" + sorted.map(formatInventory).join("\n\n");
  }
  // 3. Intent: Stability / Flat Feet
  else if (msg.includes("stability") || msg.includes("flat feet") || msg.includes("overpronat")) {
    const results = inventory.filter(s => s.type === "Stability");
    context = "User needs STABILITY support. Focus on description:\n\n" + results.map(formatDescriptionOnly).join("\n\n");
  }
  
  // 4. NEW: Competitor Mention / Similar / Alternative
  // Detects if user mentions Nike, Adidas, etc., OR words like "similar", "alternative", "vs".
  else if (
    msg.includes("nike") || msg.includes("adidas") || msg.includes("saucony") || msg.includes("new balance") || 
    msg.includes("similar") || msg.includes("alternative") || msg.includes("equivalent") || msg.includes("like the")
  ) {
    // A. Find the specific competitor shoe mentioned (if any)
    const foundKnowledge = marketKnowledge.find(s => msg.includes(s.name.toLowerCase()) || msg.includes(s.name.toLowerCase().split(" ")[0])); // Match "Pegasus" or "Nike Pegasus"
    
    // B. Get our inventory to offer alternatives
    const ourStock = inventory.map(s => `- ${s.name} ($${s.price})`).join("\n");

    if (foundKnowledge) {
      context = `User is asking about a competitor shoe: ${foundKnowledge.name}.
      
      KNOWLEDGE ABOUT COMPETITOR:
      ${formatKnowledge(foundKnowledge)}
      
      OUR STORE INVENTORY (Recommend from this list):
      ${ourStock}`;
    } else {
      // User asked for "similar" or "alternative" but didn't name a specific shoe
      context = `User is looking for recommendations similar to a popular model.
      
      OUR STORE INVENTORY:
      ${inventory.map(formatDescriptionOnly).join("\n\n")}`;
    }
  }

  // 5. Brand Mention (Internal)
  else if (msg.includes("hoka")) {
    const results = inventory.filter(s => s.brand === "Hoka");
    context = "Hoka models in stock:\n\n" + results.map(formatInventory).join("\n\n");
  }
  else if (msg.includes("asics")) {
    const results = inventory.filter(s => s.brand === "Asics");
    context = "Asics models in stock:\n\n" + results.map(formatInventory).join("\n\n");
  }
  else if (msg.includes("brooks")) {
    const results = inventory.filter(s => s.brand === "Brooks");
    context = "Brooks models in stock:\n\n" + results.map(formatInventory).join("\n\n");
  }
  else if (msg.includes("li-ning") || msg.includes("lining")) {
    const results = inventory.filter(s => s.brand === "Li-Ning");
    context = "Li-Ning models in stock:\n\n" + results.map(formatInventory).join("\n\n");
  }
  // 6. Default
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
      temperature: 0.5 // Balanced temp for natural comparison
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

    // SMART PROMPT
    const systemPrompt = {
      role: 'system',
      content: `You are a helpful, expert running shoe salesperson for "Stride & Soul".

      CRITICAL RULES:
      1. DATA SEPARATION:
         - If the data says "KNOWLEDGE ABOUT COMPETITOR", acknowledge that shoe's qualities honestly.
         - You must then RECOMMEND the closest match from "OUR STORE INVENTORY".
      2. SALES GOAL: Your goal is to sell shoes from "OUR STORE INVENTORY". Use the competitor info to bridge the conversation to our products.
      3. GROUNDING: Do not make up facts. Use the provided data.
      4. NATURAL TONE: Do not list specs (weight/price) unless asked. Focus on "feel" and "ride".
      
      DATA:
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
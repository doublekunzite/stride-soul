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

  // 1. Intent: Specific Specs (Weight/Lightest/Heaviest)
  if (msg.includes("lightest") || msg.includes("heaviest") || msg.includes("weight") || msg.includes("gram")) {
    const sorted = [...inventory].sort((a, b) => a.weight_grams - b.weight_grams);
    const lightest = sorted.slice(0, 3);
    const heaviest = sorted.slice(-3).reverse();
    
    context = "User wants technical specs. Here is our inventory data:\n\n" + 
      "TOP 3 LIGHTEST:\n" + lightest.map(formatInventory).join("\n\n") + 
      "\n\nTOP 3 HEAVIEST:\n" + heaviest.map(formatInventory).join("\n\n");
  } 
  // 2. Intent: Budget/Price
  else if (msg.includes("$") || msg.includes("price") || msg.includes("budget") || msg.includes("afford")) {
    const sorted = [...inventory].sort((a, b) => a.price - b.price);
    context = "User cares about price. Here is our inventory sorted by price:\n\n" + 
      sorted.map(formatInventory).join("\n\n");
  }
  // 3. Intent: Stability / Flat Feet (Focus on Description)
  else if (msg.includes("stability") || msg.includes("flat feet") || msg.includes("overpronat")) {
    const results = inventory.filter(s => s.type === "Stability");
    // We intentionally DO NOT include weight/price here
    context = "User needs stability support. Here are relevant models from our store:\n\n" + 
      results.map(s => `Model: ${s.name}\nType: ${s.type}\nDetails: ${s.description}`).join("\n\n");
  }
  // 4. Intent: Brand Mention (Check Inventory, then Market Knowledge)
  else if (msg.includes("nike") || msg.includes("adidas") || msg.includes("saucony") || msg.includes("new balance")) {
    // Find if we stock it
    const inStock = inventory.filter(s => s.brand.toLowerCase().includes(msg.split(' ')[0])); // simplified check
    // Find if we know it
    const known = marketKnowledge.filter(s => s.name.toLowerCase().includes(msg.split(' ')[0]));

    context = "User asked about a competitor brand.\n";
    if (inStock.length > 0) {
      context += "We stock these models:\n" + inStock.map(formatInventory).join("\n\n");
    } else {
      context += "We don't stock this brand, but here is general knowledge:\n" + known.map(formatKnowledge).join("\n\n");
      context += "\n\n(Note: Recommend similar shoes from our Inventory list if appropriate).";
    }
  }
  // 5. Default: Show Inventory Names & Market Knowledge List
  else {
    context = "Here is a summary of our store inventory:\n" + 
      inventory.map(s => `- ${s.name} ($${s.price})`).join("\n") +
      "\n\nWe also have general knowledge about these popular market models: " + 
      marketKnowledge.map(s => s.name).join(", ");
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
      temperature: 0.7 // Slightly higher temp for more natural conversation
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

    // IMPROVED PROMPT: Defines Persona clearly
    const systemPrompt = {
      role: 'system',
      content: `You are a friendly, expert running shoe salesperson for "Stride & Soul".
      
      RULES:
      1. Use the provided DATA to answer.
      2. **NATURAL CONVERSATION**: Do NOT list Price or Weight unless the user specifically asks about budget, specs, or "lightest".
      3. If discussing a shoe we DON'T sell (Market Knowledge), describe it helpfully, but try to pivot back to what we offer if it makes sense.
      4. Be helpful and conversational, like a human shop employee.
      
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
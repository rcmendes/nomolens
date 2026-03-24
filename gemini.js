const { GoogleGenAI } = require('@google/genai');

async function generateDomainNames({ name, prefixes = [], suffixes = [], prompt = '', tlds = [] }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const cleanName = name.toLowerCase().replace(/\s+/g, '');
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not defined in the environment. Returning mock data for UI testing.');
    return [
      `${cleanName}.com`,
      `${cleanName}.io`,
      `${cleanName}app.com`,
      `get${cleanName}.io`,
      `${cleanName}hq.net`,
      `try${cleanName}.co`,
      `my${cleanName}.ai`
    ];
  }

  const ai = new GoogleGenAI({ apiKey });

  // Construct the prompt
  let systemInstruction = `You are a creative naming assistant that generates domain name ideas based on user input. \nYour output MUST be a valid JSON array of strings containing ONLY the domain names (e.g., ["name1.com", "name2.io"]). Do not include markdown formatting like \`\`\`json or any other text.`;
  
  let userMessage = `Please generate up to 10 unique, catchy, and relevant domain name ideas.\n`;
  if (tlds && tlds.length > 0) {
    userMessage += `Crucially: You MUST include at least one domain idea for EVERY SINGLE TLD requested: ${tlds.join(', ')}.\n`;
    userMessage += `Start the array with the exact plain name "${cleanName}" paired with each of those requested TLDs.\n`;
  } else {
    userMessage += `Crucially: ALWAYS include the exact plain name "${cleanName}" paired with the .com and .io TLDs as the very first items in the array, regardless of prefixes or suffixes.\n`;
  }
  userMessage += `Base Name: ${name}\n`;
  
  if (prompt) {
    userMessage += `Product Context/Prompt: ${prompt}\n`;
  }
  
  if (prefixes && prefixes.length > 0) {
    userMessage += `Consider these prefixes: ${prefixes.join(', ')}\n`;
  }
  
  if (suffixes && suffixes.length > 0) {
    userMessage += `Consider these suffixes: ${suffixes.join(', ')}\n`;
  }

  if (tlds && tlds.length > 0) {
    userMessage += `\nFocus primary generation on these TLDs: ${tlds.join(', ')}. Return ONLY the JSON array.`;
  } else {
    userMessage += `\nInclude traditional TLDs like .com, .net, .io, .co, .ai depending on the context. Return ONLY the JSON array.`;
  }

  try {
    const isDev = process.env.ENV_FILE === '.env.dev' || process.env.NODE_ENV === 'development';
    if (isDev) {
      console.log(`[DEV] API Call (Gemini): generateContent (prompt: ${name})`);
    }
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userMessage,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    let text = response.text;
    if (!text) {
      throw new Error('No response text received from Gemini');
    }

    if (isDev) {
      console.log(`[DEV] API Response (Gemini): ${text}`);
    }

    // Clean up potential markdown formatting if the model disobeys
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsedDomains = JSON.parse(text);

    // Guaranteed inclusion of all selected TLDs
    if (tlds && tlds.length > 0) {
      const missingTlds = tlds.filter(tld => !parsedDomains.some(d => d.endsWith(tld)));
      for (const tld of missingTlds) {
        // Place it at the beginning so it's prominent, just like we asked Gemini to do.
        parsedDomains.unshift(`${cleanName}${tld}`);
      }
    }

    return parsedDomains;
  } catch (error) {
    const isDev = process.env.ENV_FILE === '.env.dev' || process.env.NODE_ENV === 'development';
    if (isDev) {
      console.log(`[DEV] API Error (Gemini): ${error.message}`);
    }
    console.error('Error generating domain names with Gemini:', error);
    throw error;
  }
}

module.exports = {
  generateDomainNames
};

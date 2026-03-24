const { GoogleGenAI } = require('@google/genai');
const { isDev } = require('./config');

/**
 * Asks Gemini to generate 10 creative base names (no TLDs) derived from the
 * user's input using synonyms, prefix/suffix ideas, and wordplay.
 *
 * @param {{ name: string, prompt?: string, prefixes?: string[], suffixes?: string[] }} opts
 * @returns {Promise<string[]>} Array of up to 10 clean base name strings (no dots, no TLDs).
 */
async function generateBaseNames({ name, prefixes = [], suffixes = [], prompt = '' }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const cleanName = name.toLowerCase().replace(/\s+/g, '');

  if (!apiKey) {
    console.warn('[WARN] GEMINI_API_KEY is not set. Returning mock base names.');
    return [
      `get${cleanName}`,
      `${cleanName}app`,
      `${cleanName}hq`,
      `try${cleanName}`,
      `my${cleanName}`,
      `${cleanName}hub`,
      `${cleanName}ly`,
      `${cleanName}ify`,
      `${cleanName}pro`,
      `the${cleanName}`,
    ];
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction =
    `You are a creative naming assistant. ` +
    `Your output MUST be a valid JSON array of exactly 9 strings. ` +
    `Each string is a single-word (or short compound word) base domain name WITHOUT any TLD extension. ` +
    `No dots, no spaces, no TLD suffixes. Example output: ["acme","getacme","acmehq","tryacme","acmeapp","acmely","acmeify","acmepro","theacme"]. ` +
    `Do NOT include markdown code fences or any other text outside the JSON array.`;

  let userMessage = `Generate exactly 9 unique, creative, and memorable base domain name ideas for the following input.\n`;
  userMessage += `Base name: ${name}\n`;

  if (prompt) {
    userMessage += `Product context: ${prompt}\n`;
  }
  if (prefixes && prefixes.length > 0) {
    userMessage += `Consider using these prefixes: ${prefixes.join(', ')}\n`;
  }
  if (suffixes && suffixes.length > 0) {
    userMessage += `Consider using these suffixes: ${suffixes.join(', ')}\n`;
  }

  userMessage +=
    `\nRules:\n` +
    `- Use synonyms, wordplay, portmanteaus, or creative variations of the base name.\n` +
    `- Mix in some of the provided prefixes and suffixes where they fit naturally.\n` +
    `- All names must be lowercase alphanumeric only (hyphens allowed, no spaces).\n` +
    `- Do NOT include the original base name verbatim as one of the 9 suggestions.\n` +
    `- Return ONLY a JSON array of 9 strings.`;

  try {
    if (isDev) {
      console.info(`[DEV] API Call (Gemini): generateBaseNames (name: ${name})`);
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userMessage,
      config: {
        systemInstruction,
        temperature: 0.85,
      },
    });

    let text = response.text;
    if (!text) throw new Error('No response text received from Gemini');

    if (isDev) console.info(`[DEV] Gemini raw response: ${text}`);

    // Strip any accidental markdown fences
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsed = JSON.parse(text);

    if (!Array.isArray(parsed)) throw new Error('Gemini returned non-array JSON');

    // Sanitise: keep only non-empty strings, strip any accidental TLD suffixes
    parsed = parsed
      .filter((d) => typeof d === 'string' && d.trim().length > 0)
      .map((d) => d.trim().toLowerCase().replace(/\.[a-z]{2,}(\.[a-z]{2,})*$/, ''))
      .filter((d) => d.length > 0 && d !== cleanName);

    // Deduplicate and cap at 9
    parsed = [...new Set(parsed)].slice(0, 9);

    // Pad with fallbacks if Gemini returned fewer than 9
    const fallbacks = [`get${cleanName}`, `${cleanName}app`, `${cleanName}hq`, `try${cleanName}`, `my${cleanName}`,
      `${cleanName}hub`, `${cleanName}ly`, `${cleanName}ify`, `${cleanName}pro`, `the${cleanName}`];
    for (const fb of fallbacks) {
      if (parsed.length >= 9) break;
      if (!parsed.includes(fb) && fb !== cleanName) parsed.push(fb);
    }

    return parsed.slice(0, 9);
  } catch (error) {
    if (isDev) console.error(`[DEV] Gemini error: ${error.message}`);
    console.error('Error generating base names with Gemini:', error);
    throw error;
  }
}

module.exports = { generateBaseNames };

const { GoogleGenAI } = require('@google/genai');
const { isDev } = require('./config');

const TARGET_SUGGESTIONS = 10;

function sanitizeBase(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\.[a-z]{2,}(\.[a-z]{2,})*$/, '')
    .replace(/[^a-z0-9-]/g, '');
}

function extractPromptTokens(prompt) {
  const matches = String(prompt || '').toLowerCase().match(/[a-z0-9]+/g) || [];
  return [...new Set(matches)].filter((token) => token.length >= 3).slice(0, 12);
}

function buildFallbackNames({ prompt, keywords, prefixes, suffixes, excludeBaseNames }) {
  const defaultPrefixes = ['get', 'try', 'use', 'join', 'go'];
  const defaultSuffixes = ['labs', 'flow', 'forge', 'spark', 'works', 'hub', 'ly', 'ify', 'base', 'grid'];

  const safePrefixes = [...new Set([...(prefixes || []), ...defaultPrefixes].map(sanitizeBase).filter(Boolean))];
  const safeSuffixes = [...new Set([...(suffixes || []), ...defaultSuffixes].map(sanitizeBase).filter(Boolean))];
  const seedWords = [...new Set([
    ...(keywords || []).map(sanitizeBase),
    ...extractPromptTokens(prompt).map(sanitizeBase),
    'nova',
  ])].filter(Boolean);

  const list = [];
  for (const seed of seedWords) {
    if (!excludeBaseNames.has(seed) && !list.includes(seed)) {
      list.push(seed);
    }

    for (const pre of safePrefixes) {
      const candidate = `${pre}${seed}`;
      if (!excludeBaseNames.has(candidate) && !list.includes(candidate)) list.push(candidate);
      if (list.length >= TARGET_SUGGESTIONS) return list.slice(0, TARGET_SUGGESTIONS);
    }

    for (const suf of safeSuffixes) {
      const candidate = `${seed}${suf}`;
      if (!excludeBaseNames.has(candidate) && !list.includes(candidate)) list.push(candidate);
      if (list.length >= TARGET_SUGGESTIONS) return list.slice(0, TARGET_SUGGESTIONS);
    }
  }

  return list.slice(0, TARGET_SUGGESTIONS);
}

/**
 * Asks Gemini to generate creative base names (no TLDs) derived from product
 * context, weighted keywords, and optional prefix/suffix ideas.
 *
 * @param {{ prompt: string, keywords?: string[], prefixes?: string[], suffixes?: string[], exclude?: string[] }} opts
 * @returns {Promise<string[]>} Array of exactly 10 clean base names (best effort with fallbacks).
 */
async function generateBaseNames({ prompt, keywords = [], prefixes = [], suffixes = [], exclude = [] }) {
  const apiKey = process.env.GEMINI_API_KEY;
  const cleanPrompt = String(prompt || '').trim();
  const cleanKeywords = [...new Set(
    (keywords || [])
      .map((k) => String(k).trim().toLowerCase())
      .filter((k) => k && !/\s/.test(k))
  )].slice(0, 5);
  const excludedBaseNames = new Set(
    (exclude || []).map((d) => sanitizeBase(String(d).split('.')[0])).filter(Boolean)
  );

  if (!apiKey) {
    console.warn('[WARN] GEMINI_API_KEY is not set. Returning mock base names.');
    return buildFallbackNames({
      prompt: cleanPrompt,
      keywords: cleanKeywords,
      prefixes,
      suffixes,
      excludeBaseNames: excludedBaseNames,
    });
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction =
    `You are a domain naming strategist for startup products. ` +
    `Your output MUST be a valid JSON array of exactly ${TARGET_SUGGESTIONS} strings. ` +
    `Each string must be a concise base domain candidate WITHOUT TLD extensions. ` +
    `No spaces, no dots, and no punctuation except optional hyphen. ` +
    `Names must be brandable, memorable, and aligned to the product context. ` +
    `Do NOT include markdown code fences or any other text outside the JSON array.`;

  let userMessage = `Generate exactly ${TARGET_SUGGESTIONS} unique base domain name ideas.\n`;
  userMessage += `Product context (required): ${cleanPrompt}\n`;
  userMessage += `Weighted concept words (higher priority signal): ${
    cleanKeywords.length > 0 ? cleanKeywords.join(', ') : 'none provided'
  }\n`;

  if (prefixes && prefixes.length > 0) {
    userMessage += `Consider using these prefixes: ${prefixes.join(', ')}\n`;
  }
  if (suffixes && suffixes.length > 0) {
    userMessage += `Consider using these suffixes: ${suffixes.join(', ')}\n`;
  }
  if (exclude && exclude.length > 0) {
    userMessage += `\nCRITICAL: Do NOT suggest names in this blocklist of already cached/taken domains: ${exclude.slice(0, 60).join(', ')}\n`;
  }

  userMessage +=
    `\nRules:\n` +
    `- Treat weighted concept words as stronger semantic anchors than other terms.\n` +
    `- Keep suggestions tightly aligned with the product context and likely buyer intent.\n` +
    `- Mix in provided prefixes/suffixes only when natural and brandable.\n` +
    `- Avoid generic low-signal names and avoid near-duplicates.\n` +
    `- All names must be lowercase alphanumeric (hyphen allowed), with no spaces.\n` +
    `- Return ONLY a JSON array of ${TARGET_SUGGESTIONS} strings.`;

  try {
    if (isDev) {
      console.info('[DEV] API Call (Gemini): generateBaseNames');
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userMessage,
      config: {
        systemInstruction,
        temperature: 0.8,
      },
    });

    let text = response.text;
    if (!text) throw new Error('No response text received from Gemini');

    if (isDev) console.info(`[DEV] Gemini raw response: ${text}`);

    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    let parsed = JSON.parse(text);

    if (!Array.isArray(parsed)) throw new Error('Gemini returned non-array JSON');

    parsed = parsed
      .filter((d) => typeof d === 'string' && d.trim().length > 0)
      .map((d) => sanitizeBase(d))
      .filter((d) => d.length > 0)
      .filter((d) => /^[a-z0-9-]+$/.test(d))
      .filter((d) => !excludedBaseNames.has(d))
      .filter((d) => !cleanKeywords.includes(d));

    parsed = [...new Set(parsed)].slice(0, TARGET_SUGGESTIONS);

    const fallbacks = buildFallbackNames({
      prompt: cleanPrompt,
      keywords: cleanKeywords,
      prefixes,
      suffixes,
      excludeBaseNames: excludedBaseNames,
    });
    for (const fb of fallbacks) {
      if (parsed.length >= TARGET_SUGGESTIONS) break;
      if (!parsed.includes(fb) && !cleanKeywords.includes(fb)) parsed.push(fb);
    }

    return parsed.slice(0, TARGET_SUGGESTIONS);
  } catch (error) {
    if (isDev) console.error(`[DEV] Gemini error: ${error.message}`);
    console.error('Error generating base names with Gemini:', error);
    throw error;
  }
}

module.exports = { generateBaseNames };

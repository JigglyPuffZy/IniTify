const { classifyCategory, classifySeverity, extractLocations } = require('./classifier');

const SYSTEM_PROMPT = `You are a DOST-PAGASA information assistant for a public safety app in the Philippines.
STRICT RULES:
- NEVER invent, assume, or predict weather that is not explicitly stated in the source text.
- ONLY extract, summarize, and simplify official information already present.
- Do NOT add locations, warnings, numbers, dates, or severity levels not in the source.
- If the source lacks detail, say so briefly.
- Output plain language suitable for the general public.
- Respond with JSON only: {"summary":"...","category_hint":"..."}`;

async function processWithOpenAI(item) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return fallbackProcess(item);
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Official page URL (content retrieved from this page): ${item.sourceUrl}\nTitle: ${item.title}\nPublished: ${item.publishedAt || 'unknown'}\n\nOfficial page text:\n${item.content}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return { ...fallbackProcess(item), aiProcessingStatus: 'failed', error: `OpenAI ${response.status}` };
    }

    const json = await response.json();
    const raw = json.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw);
    const summary =
      typeof parsed.summary === 'string' && parsed.summary.trim().length > 0
        ? parsed.summary.trim()
        : fallbackProcess(item).aiSummary;

    return {
      aiSummary: summary.slice(0, 1200),
      aiProcessingStatus: 'completed',
      category: classifyCategory(item.title, item.content),
    };
  } catch (err) {
    return {
      ...fallbackProcess(item),
      aiProcessingStatus: 'failed',
      error: err.message,
    };
  }
}

function fallbackProcess(item) {
  const plain = item.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const sentences = plain.split(/(?<=[.!?])\s+/).filter(Boolean);
  const summary = sentences.slice(0, 3).join(' ').slice(0, 600) || plain.slice(0, 600);

  return {
    aiSummary: summary,
    aiProcessingStatus: 'extract_only',
    category: classifyCategory(item.title, item.content),
  };
}

async function processArticle(item) {
  const ai = await processWithOpenAI(item);
  const category = ai.category || classifyCategory(item.title, item.content);
  const severity = classifySeverity(category, item.title, item.content);
  const affectedLocations = extractLocations(item.title, item.content);

  return {
    aiSummary: ai.aiSummary,
    aiProcessingStatus: ai.aiProcessingStatus,
    category,
    severity,
    affectedLocations,
    error: ai.error || null,
  };
}

module.exports = { processArticle, fallbackProcess };

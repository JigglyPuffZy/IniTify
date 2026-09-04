/**
 * Quick Tify AI connectivity check (does not print API keys).
 * Usage: node scripts/check-check-in-ai.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadDotEnv() {
  const path = resolve(process.cwd(), '.env');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotEnv();

const apiKey = process.env.EXPO_PUBLIC_CHECK_IN_AI_API_KEY?.trim();
const baseUrl = (process.env.EXPO_PUBLIC_CHECK_IN_AI_BASE_URL?.trim() || 'https://api.openai.com/v1').replace(
  /\/$/,
  '',
);
const model = process.env.EXPO_PUBLIC_CHECK_IN_AI_MODEL?.trim() || 'gpt-4o-mini';

console.log('--- IniTify Check-in AI status ---');
console.log(`API key configured: ${Boolean(apiKey)}`);
console.log(`Base URL: ${baseUrl}`);
console.log(`Model: ${model}`);

if (!apiKey) {
  console.log('\nResult: OFFLINE (no key) — Tify uses scripted check-in only.');
  console.log('Add EXPO_PUBLIC_CHECK_IN_AI_API_KEY to .env and restart Expo.');
  process.exit(1);
}

const started = Date.now();
try {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 16,
      messages: [
        { role: 'system', content: 'Reply with exactly: OK' },
        { role: 'user', content: 'ping' },
      ],
    }),
  });

  const durationMs = Date.now() - started;
  const body = await response.text();

  if (!response.ok) {
    console.log(`\nResult: FAILED (HTTP ${response.status}) in ${durationMs}ms`);
    console.log('Error preview:', body.slice(0, 280).replace(/\s+/g, ' '));
    process.exit(1);
  }

  let reply = '';
  try {
    const json = JSON.parse(body);
    reply = json.choices?.[0]?.message?.content?.trim() ?? '';
  } catch {
    reply = '(unparsed response)';
  }

  console.log(`\nResult: OK (${durationMs}ms)`);
  console.log(`Sample reply: ${reply.slice(0, 80)}`);
  process.exit(0);
} catch (error) {
  const durationMs = Date.now() - started;
  console.log(`\nResult: NETWORK ERROR after ${durationMs}ms`);
  console.log(String(error));
  process.exit(1);
}

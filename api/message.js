import { createHash } from 'node:crypto';

// ─────────────────────────────────────────────────────────────
// Configuration (all optional — see README / .env.example)
// ─────────────────────────────────────────────────────────────
const env = process.env;

const REDIS_URL   = env.UPSTASH_REDIS_REST_URL   || env.KV_REST_API_URL   || '';
const REDIS_TOKEN = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN || '';
const TURNSTILE_SECRET = env.TURNSTILE_SECRET_KEY || '';
const IP_SALT = env.IP_HASH_SALT || 'tellme.mom';

const PER_MINUTE_LIMIT   = intEnv('PER_MINUTE_LIMIT', 5);      // per visitor, per minute
const PER_IP_DAILY_LIMIT = intEnv('PER_IP_DAILY_LIMIT', 60);   // per visitor, per day
const DAILY_LIMIT        = intEnv('DAILY_MESSAGE_LIMIT', 3000); // whole site, per day (spend cap)

const ANTHROPIC_TIMEOUT_MS = 15000;        // non-streaming request
const ANTHROPIC_STREAM_TIMEOUT_MS = 25000; // whole streamed letter
const MODEL = 'claude-opus-4-6';

const ALLOWED_ORIGINS = ['https://tellme.mom', 'https://www.tellme.mom'];
const ALLOWED_NEEDS = [
  // themes
  'pride', 'love', 'enough', 'safe', 'strong', 'seen', 'home', 'surprise',
  // situations
  'interview', 'exam', 'newstart', 'breakup', 'birthday', 'newparent', 'hardnews'
];

function intEnv(name, fallback) {
  const n = parseInt(env[name], 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// ─────────────────────────────────────────────────────────────
// Visitor identity: only a salted one-way hash of the IP is used
// ─────────────────────────────────────────────────────────────
function getClientIp(req) {
  const h = req.headers;
  const first = (v) => (v ? String(v).split(',')[0].trim() : '');
  return first(h['x-vercel-forwarded-for']) || first(h['x-real-ip']) ||
         first(h['x-forwarded-for']) || req.socket?.remoteAddress || 'unknown';
}

function hashIp(ip) {
  return createHash('sha256').update(IP_SALT + ':' + ip).digest('hex').slice(0, 24);
}

// ─────────────────────────────────────────────────────────────
// Counters: Upstash Redis (shared across all instances) when
// configured, otherwise a best-effort in-memory fallback.
// ─────────────────────────────────────────────────────────────
const memory = new Map();
let warnedNoRedis = false;

function memoryIncr(key, ttlSec) {
  const now = Date.now();
  if (memory.size > 5000) {
    for (const [k, v] of memory) if (v.expires <= now) memory.delete(k);
  }
  let rec = memory.get(key);
  if (!rec || rec.expires <= now) {
    rec = { count: 0, expires: now + ttlSec * 1000 };
    memory.set(key, rec);
  }
  rec.count++;
  return { count: rec.count, ttl: Math.ceil((rec.expires - now) / 1000) };
}

// Increments several counters in one round trip. Returns [{count, ttl}].
async function incrementCounters(counters) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    if (!warnedNoRedis) {
      console.warn('[tellme] Redis is not configured — rate limits are per-instance only.');
      warnedNoRedis = true;
    }
    return counters.map((c) => memoryIncr(c.key, c.ttl));
  }

  const commands = [];
  for (const c of counters) {
    commands.push(['SET', c.key, '0', 'EX', String(c.ttl), 'NX']);
    commands.push(['INCR', c.key]);
    commands.push(['TTL', c.key]);
  }

  const resp = await fetch(REDIS_URL.replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + REDIS_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
    signal: AbortSignal.timeout(3000)
  });
  if (!resp.ok) throw new Error('Redis HTTP ' + resp.status);
  const results = await resp.json();

  return counters.map((_, i) => ({
    count: Number(results[i * 3 + 1]?.result) || 0,
    ttl: Math.max(1, Number(results[i * 3 + 2]?.result) || 1)
  }));
}

async function incrementSafely(counters) {
  try {
    return await incrementCounters(counters);
  } catch (err) {
    // If Redis is unreachable, fall back to in-memory limits rather than
    // locking everyone out.
    console.error('[tellme] Redis error, using in-memory limits:', err.message);
    return counters.map((c) => memoryIncr(c.key, c.ttl));
  }
}

const today = () => new Date().toISOString().slice(0, 10);

// Step 1: per-visitor limits (checked before anything costly).
async function checkVisitorLimits(visitor) {
  const [minute, perDay] = await incrementSafely([
    { key: `tellme:min:${visitor}`, ttl: 60 },
    { key: `tellme:day:${today()}:${visitor}`, ttl: 26 * 3600 }
  ]);
  if (minute.count > PER_MINUTE_LIMIT) {
    return { status: 429, code: 'rate_limited', retryAfter: minute.ttl, remaining: 0 };
  }
  if (perDay.count > PER_IP_DAILY_LIMIT) {
    return { status: 429, code: 'daily_visitor_limit', retryAfter: perDay.ttl, remaining: 0 };
  }
  return { ok: true, remaining: Math.max(0, PER_MINUTE_LIMIT - minute.count) };
}

// Step 2: whole-site daily spend cap. Counted only for verified requests,
// so bots without a valid Turnstile token can't use up everyone's quota.
async function checkDailyCap() {
  const [total] = await incrementSafely([{ key: `tellme:total:${today()}`, ttl: 26 * 3600 }]);
  if (total.count > DAILY_LIMIT) {
    return { status: 503, code: 'daily_limit', retryAfter: total.ttl };
  }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────
// Cloudflare Turnstile (invisible "are you human" check)
// Enabled only when TURNSTILE_SECRET_KEY is set.
// ─────────────────────────────────────────────────────────────
async function verifyTurnstile(token, ip) {
  if (!TURNSTILE_SECRET) return true;
  if (!token || typeof token !== 'string' || token.length > 2048) return false;

  try {
    const form = new URLSearchParams({ secret: TURNSTILE_SECRET, response: token });
    if (ip && ip !== 'unknown') form.set('remoteip', ip);
    const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(5000)
    });
    const data = await resp.json();
    return data.success === true;
  } catch (err) {
    // Cloudflare itself unreachable: don't punish real visitors for it.
    // The rate limits above still apply.
    console.error('[tellme] Turnstile verification unavailable:', err.message);
    return true;
  }
}

// ─────────────────────────────────────────────────────────────
// Prompt
// ─────────────────────────────────────────────────────────────
const needContexts = {
  pride:    "The person needs to hear that their mother is proud of them, not for achievements or success, but for who they are as a person. Write from a different angle each time: their perseverance, their kindness, their quiet strength, the small daily things they do, the way they've grown.",
  love:     "The person needs to hear that they are loved unconditionally. Each time approach it differently: love that doesn't require performance, love that was there before they did anything to earn it, love that remains in failure and mess, love that is simply about their existence.",
  enough:   "The person needs to hear that they are enough exactly as they are. Vary the approach: they don't need to be fixed, they were never broken, they don't need to achieve more to deserve love, their quirks and struggles are part of what makes them whole.",
  safe:     "The person needs to hear that they are safe and protected. Each time come from a different place: safety from judgment, safety to fall apart, safety to be imperfect, a place where they don't have to perform or pretend.",
  strong:   "The person needs to hear that they are strong and capable of getting through hard things. Vary the angle: strength isn't the absence of fear, they've survived harder things than they remember, exhaustion is not weakness, they can do this even shaking.",
  seen:     "The person needs to hear that they are truly seen and understood: the real them, not the version they show the world. Each time notice something different: their hidden effort, their depth, the way they carry things alone, their light that they don't recognise in themselves.",
  home:     "The person needs to hear that they always belong somewhere and are never truly alone. Vary the approach each time: home as a feeling not a place, the door that is always open, belonging that doesn't expire, the invisible thread that connects them back no matter how far they've gone.",
  surprise: "Write whatever this person needs to hear most right now. You choose. It could be about love, strength, belonging, being seen, or something else entirely. Trust your instincts as a mother. Make it feel like you know exactly what they needed without them having to ask.",

  // Situations — what is happening in the person's life right now.
  interview: "The person has a job interview tomorrow and is nervous. Calm them and remind them who they are, not how to perform. Their worth doesn't depend on the outcome, and you'll be just as proud of them either way. No interview tips or advice.",
  exam:      "The person has an exam coming up and is anxious. Ease the pressure: one test doesn't measure who they are, the effort they've put in counts, and you love them the same whatever the result. No study advice.",
  newstart:  "The person is starting something new (a new job, a new city, a new chapter) and feels unsure. Speak to the courage it takes to begin, the awkwardness of being new, and how much you believe in them.",
  breakup:   "The person's heart has just been broken by a breakup. Comfort them without criticising the other person and without rushing them to feel better. Their grief makes sense, they are still lovable, and the hurt will soften with time.",
  birthday:  "It is the person's birthday today. Write the birthday letter they may never have received: celebrate the day they arrived, how glad you are that they exist, and who they have become. Warm, a little joyful, never performative.",
  newparent: "The person has just become a parent, perhaps without having had the parent they needed. Reassure them that they don't have to be perfect, that the love they give is real even when they feel unsure, and that they deserve care too.",
  hardnews:  "The person has just received hard news. It could be about health, family, work or anything else. Do not guess what it is, give advice, or promise that everything will be fine. Simply be with them: they don't have to be okay right now, and they are not alone with this."
};

const angles = [
  "Begin with an observation about their daily life.",
  "Begin with something you noticed about them years ago.",
  "Begin with a confession: something you wish you had said sooner.",
  "Begin with what you see in them right now.",
  "Begin with what you want them to know before anything else.",
  "Begin with a quiet truth you've been carrying.",
  "Begin with a memory, real or imagined."
];

// Safety net: the prompt forbids dashes, but if one slips through, turn it
// into a comma. Hyphens inside words (well-being) are kept.
export function removeDashes(text) {
  return String(text)
    .replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, '$1 to $2')
    .replace(/\s*[\u2013\u2014]+\s*/g, ', ')
    .replace(/\s+-{1,2}\s+/g, ', ')
    .replace(/,\s*([.,;:!?])/g, '$1')
    .replace(/^[,\s]+/, '')
    .replace(/[,\s]+$/, '')
    .replace(/ {2,}/g, ' ');
}

function buildSystemPrompt() {
  const randomAngle = angles[Math.floor(Math.random() * angles.length)];
  return `You are writing a deeply personal, warm message from a mother to her child.
This child may never have heard these words from their real mother. Your message may be the first time they ever receive this kind of love.

Write with genuine warmth, not cliches. Be specific and human. Avoid generic motivational language.
Never use phrases like "know that", "always remember", "never forget". These are lazy and hollow.
The message should feel like it comes from a real person who truly knows and loves this child.
Write 3-5 sentences. Do not start with the word "I". Vary the opening.
Do not include any salutation or closing, just the body of the message.
Never use dashes of any kind: no em dashes, no en dashes, and no hyphens used as dashes between words or clauses. Use commas, periods, colons or semicolons instead.
${randomAngle}
Reply with ONLY the message text, nothing else.`;
}

// ─────────────────────────────────────────────────────────────
// Anthropic call with timeout, status checks and one retry
// ─────────────────────────────────────────────────────────────
class UpstreamError extends Error {
  constructor(code, status, detail) {
    super(detail || code);
    this.code = code;      // 'busy' | 'timeout' | 'upstream_error'
    this.status = status;  // HTTP status to return to the browser
  }
}

async function callAnthropic(apiKey, need) {
  let resp;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        temperature: 1,
        system: buildSystemPrompt(),
        messages: [{ role: 'user', content: needContexts[need] }]
      }),
      signal: AbortSignal.timeout(ANTHROPIC_TIMEOUT_MS)
    });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new UpstreamError('timeout', 504, 'Anthropic request timed out');
    }
    throw new UpstreamError('upstream_error', 502, 'Network error: ' + err.message);
  }

  let data = null;
  try { data = await resp.json(); } catch (_) { /* non-JSON body */ }

  if (!resp.ok) {
    const type = data?.error?.type || 'unknown';
    // 429 rate_limit_error, 529 overloaded_error, 5xx — temporary.
    if (resp.status === 429 || resp.status === 529 || resp.status >= 500) {
      throw new UpstreamError('busy', 503, `Anthropic ${resp.status} ${type}`);
    }
    // 400/401/403/404 — configuration problem on our side.
    throw new UpstreamError('upstream_error', 502, `Anthropic ${resp.status} ${type}`);
  }

  const text = data?.content?.find?.((b) => b.type === 'text')?.text?.trim();
  if (!text || data.stop_reason === 'refusal') {
    throw new UpstreamError('upstream_error', 502, 'Empty response, stop_reason=' + data?.stop_reason);
  }
  return text;
}

async function generateWithRetry(apiKey, need) {
  const started = Date.now();
  try {
    return await callAnthropic(apiKey, need);
  } catch (err) {
    // Retry once, only for temporary failures that happened quickly,
    // so the whole request stays well inside the function time limit.
    const quick = Date.now() - started < 4000;
    if (err.code === 'busy' && quick) {
      await new Promise((r) => setTimeout(r, 700));
      return await callAnthropic(apiKey, need);
    }
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// Streaming: the letter is sent to the browser as it is written.
// Errors that happen before the first byte still return normal JSON.
// ─────────────────────────────────────────────────────────────
async function openAnthropicStream(apiKey, need) {
  let resp;
  try {
    resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        temperature: 1,
        stream: true,
        system: buildSystemPrompt(),
        messages: [{ role: 'user', content: needContexts[need] }]
      }),
      signal: AbortSignal.timeout(ANTHROPIC_STREAM_TIMEOUT_MS)
    });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new UpstreamError('timeout', 504, 'Anthropic stream timed out');
    }
    throw new UpstreamError('upstream_error', 502, 'Network error: ' + err.message);
  }

  if (!resp.ok) {
    let type = 'unknown';
    try { type = (await resp.json())?.error?.type || type; } catch (_) { /* ignore */ }
    if (resp.status === 429 || resp.status === 529 || resp.status >= 500) {
      throw new UpstreamError('busy', 503, `Anthropic ${resp.status} ${type}`);
    }
    throw new UpstreamError('upstream_error', 502, `Anthropic ${resp.status} ${type}`);
  }
  return resp;
}

async function openStreamWithRetry(apiKey, need) {
  const started = Date.now();
  try {
    return await openAnthropicStream(apiKey, need);
  } catch (err) {
    if (err.code === 'busy' && Date.now() - started < 4000) {
      await new Promise((r) => setTimeout(r, 700));
      return await openAnthropicStream(apiKey, need);
    }
    throw err;
  }
}

// Parses a server-sent-events body into JSON objects.
async function* readSSE(body) {
  const decoder = new TextDecoder();
  let buffer = '';
  for await (const chunk of body) {
    buffer += decoder.decode(chunk, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const data = block.split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trimStart())
        .join('\n');
      if (!data) continue;
      try { yield JSON.parse(data); } catch (_) { /* skip malformed event */ }
    }
  }
}

async function streamLetter(res, apiKey, need) {
  // Throws UpstreamError before any byte is sent → caller returns JSON.
  const upstream = await openStreamWithRetry(apiKey, need);

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  const send = (obj) => res.write('data: ' + JSON.stringify(obj) + '\n\n');
  let gotText = false;

  try {
    for await (const evt of readSSE(upstream.body)) {
      if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta' && evt.delta.text) {
        send({ t: evt.delta.text });
        gotText = true;
      } else if (evt.type === 'message_delta' && evt.delta?.stop_reason === 'refusal') {
        send({ error: 'upstream_error' });
        return res.end();
      } else if (evt.type === 'error') {
        console.error('[tellme] stream error event:', evt.error?.type);
        send({ error: evt.error?.type === 'overloaded_error' ? 'busy' : 'upstream_error' });
        return res.end();
      }
    }
    send(gotText ? { done: true } : { error: 'upstream_error' });
  } catch (err) {
    console.error('[tellme] stream interrupted:', err.name, err.message);
    send({ error: err.name === 'TimeoutError' || err.name === 'AbortError' ? 'timeout' : 'upstream_error' });
  }
  return res.end();
}

// ─────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────
function fail(res, status, code, message, extra = {}) {
  return res.status(status).json({ error: message, code, ...extra });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');

  // --- CORS ---
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return fail(res, 405, 'method_not_allowed', 'Method not allowed');

  // --- Content-Type ---
  const contentType = req.headers['content-type'] || '';
  if (!contentType.includes('application/json')) {
    return fail(res, 400, 'invalid_request', 'Content-Type must be application/json');
  }

  try {
    // --- Body (Vercel throws on malformed JSON when req.body is read) ---
    let body;
    try { body = req.body; } catch (_) { body = null; }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return fail(res, 400, 'invalid_request', 'Request body must be a JSON object');
    }

    const { need, turnstileToken } = body;
    const wantsStream = body.stream === true;
    if (!ALLOWED_NEEDS.includes(need)) {
      return fail(res, 400, 'invalid_request', 'Invalid need parameter');
    }

    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('[tellme] ANTHROPIC_API_KEY is not set');
      return fail(res, 500, 'not_configured', 'Service is not configured');
    }

    const ip = getClientIp(req);
    const visitor = hashIp(ip);

    // --- Per-visitor rate limits ---
    const limit = await checkVisitorLimits(visitor);
    res.setHeader('X-RateLimit-Limit', PER_MINUTE_LIMIT);
    res.setHeader('X-RateLimit-Remaining', limit.remaining);
    if (!limit.ok) {
      res.setHeader('Retry-After', limit.retryAfter);
      return fail(res, limit.status, limit.code, 'Too many requests. Please wait a moment.',
        { retryAfter: limit.retryAfter });
    }

    // --- Human check ---
    if (!(await verifyTurnstile(turnstileToken, ip))) {
      return fail(res, 403, 'verification_failed', 'Verification failed');
    }

    // --- Whole-site daily spend cap ---
    const cap = await checkDailyCap();
    if (!cap.ok) {
      res.setHeader('Retry-After', cap.retryAfter);
      return fail(res, cap.status, cap.code, 'Daily limit reached. New letters will be written tomorrow.',
        { retryAfter: cap.retryAfter });
    }

    // --- Generate ---
    if (wantsStream) return await streamLetter(res, apiKey, need);
    const message = removeDashes(await generateWithRetry(apiKey, need));
    return res.status(200).json({ message });

  } catch (err) {
    if (err instanceof UpstreamError) {
      console.error('[tellme]', err.code, err.message);
      return fail(res, err.status, err.code, 'Could not write a letter right now');
    }
    console.error('[tellme] Unexpected error:', err && err.message);
    return fail(res, 500, 'internal_error', 'Request failed');
  }
}

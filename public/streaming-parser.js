// streaming-parser.js
// Robust streaming parser & helpers for fetch SSE-style "data:" streams.
//
// Exports (via module.exports or global functions):
// - processStreamChunk(chunk, appendFn)     => process a raw string chunk (handles data: lines, [DONE]) 
// - extractTokenFromParsed(parsed)          => try many JSON shapes to return token text (or null)
// - streamFetchToAppender(response, appendFn, onDone) => reads fetch response.body, decodes chunks, calls processStreamChunk
// - wireUpEventSource(es, appendFn, onDone) => helper for EventSource (if you ever switch to SSE)
// - makeAppender(elementOrId)               => helper to append tokens into an element

function extractTokenFromParsed(parsed) {
  if (parsed == null) return null;

  if (typeof parsed === 'string') return parsed;
  if (typeof parsed === 'number' || typeof parsed === 'boolean') return String(parsed);

  // simple top-level fields
  if (typeof parsed.text === 'string') return parsed.text;
  if (typeof parsed.content === 'string') return parsed.content;
  if (typeof parsed.output === 'string') return parsed.output;
  if (typeof parsed.completion === 'string') return parsed.completion;

  // choices[] shapes (OpenAI-like & older completions)
  if (Array.isArray(parsed.choices) && parsed.choices.length) {
    try {
      for (const ch of parsed.choices) {
        if (!ch) continue;
        if (ch.delta) {
          const d = ch.delta;
          if (typeof d.content === 'string' && d.content.length) return d.content;
          if (d.message && d.message.content) {
            const mc = d.message.content;
            if (typeof mc === 'string' && mc.length) return mc;
            if (Array.isArray(mc.parts)) return mc.parts.join('');
          }
        }
        if (typeof ch.text === 'string' && ch.text.length) return ch.text;
      }
    } catch (e) { /* ignore */ }
  }

  // message.content.parts
  if (parsed.message && parsed.message.content) {
    const mc = parsed.message.content;
    if (typeof mc === 'string') return mc;
    if (Array.isArray(mc.parts)) return mc.parts.join('');
  }

  // single string field fallback
  const keys = Object.keys(parsed || {});
  if (keys.length === 1 && typeof parsed[keys[0]] === 'string') return parsed[keys[0]];

  // shallow scan for string arrays
  for (const k of keys) {
    if (Array.isArray(parsed[k])) {
      const arr = parsed[k].filter(x => typeof x === 'string');
      if (arr.length) return arr.join('');
    }
    if (typeof parsed[k] === 'string') return parsed[k];
  }

  return null;
}

function processStreamChunk(chunk, appendFn) {
  if (!chunk || !chunk.length) return {};

  const normalized = chunk.replace(/\r\n/g, '\n');

  // split into SSE-like messages (double newline separators)
  const parts = normalized.split(/\n\n+/);

  for (let raw of parts) {
    raw = raw.trim();
    if (!raw) continue;

    // support multiple lines of "data: ..." inside a part
    const dataLines = raw.split(/\n+/).map(l => l.trim()).filter(Boolean);

    for (const line of dataLines) {
      let payload = line;
      if (line.startsWith('data:')) {
        payload = line.replace(/^data:\s*/, '');
      }

      if (payload === '[DONE]') return { done: true };

      // try JSON parse, otherwise treat as plain text
      let parsed = null;
      try {
        parsed = JSON.parse(payload);
      } catch (e) {
        // not JSON — treat payload as raw text token
        const token = payload;
        if (token && token.length && typeof appendFn === 'function') appendFn(token);
        continue;
      }

      const token = extractTokenFromParsed(parsed);
      if (token && typeof appendFn === 'function') appendFn(token);
    }
  }

  return {};
}

function makeAppender(elementOrId) {
  const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
  if (!el) return () => {};
  return (token) => {
    el.textContent = el.textContent + token;
    if (el.scrollIntoView) el.scrollIntoView({ block: 'end' });
  };
}

function wireUpEventSource(es, appendFn, onDone) {
  if (!es) return;
  es.addEventListener('message', ev => {
    const r = processStreamChunk(ev.data, appendFn);
    if (r.done && typeof onDone === 'function') onDone();
  });
  es.addEventListener('error', ev => {
    console.error('SSE error', ev);
  });
}

async function streamFetchToAppender(response, appendFn, onDone) {
  if (!response || !response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let done = false;
  while (!done) {
    const { value, done: streamDone } = await reader.read();
    done = streamDone;
    if (value) {
      const chunk = decoder.decode(value, { stream: true });
      const r = processStreamChunk(chunk, appendFn);
      if (r.done && typeof onDone === 'function') {
        onDone();
        return;
      }
    }
  }
  // if ended without explicit [DONE]
  if (typeof onDone === 'function') onDone();
}

// export for module systems (optional)
if (typeof module !== 'undefined') {
  module.exports = {
    processStreamChunk,
    extractTokenFromParsed,
    makeAppender,
    wireUpEventSource,
    streamFetchToAppender
  };
}

// expose to window for direct usage in browser without bundler
if (typeof window !== 'undefined') {
  window.processStreamChunk = processStreamChunk;
  window.extractTokenFromParsed = extractTokenFromParsed;
  window.makeAppender = makeAppender;
  window.wireUpEventSource = wireUpEventSource;
  window.streamFetchToAppender = streamFetchToAppender;
}

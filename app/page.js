// replace your handleGenerate implementation with this (inside app/page.js)
async function handleGenerate(e) {
  e && e.preventDefault();
  if (!prompt.trim()) {
    setStatus('Please enter a topic or prompt.');
    return;
  }
  setContent('');
  setStatus('Generating…');
  setStreaming(true);
  bufferRef.current = '';

  if (controllerRef.current) {
    try { controllerRef.current.abort(); } catch (e) {}
  }
  const ctrl = new AbortController();
  controllerRef.current = ctrl;

  try {
    const res = await fetch('/api/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: ctrl.signal
    });

    if (!res.ok) {
      const txt = await res.text();
      setStatus(`Server error: ${res.status}`);
      setStreaming(false);
      setContent(txt);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;

    // We will capture any SEO JSON block that appears at the start and set title/meta
    let seoCaptured = false;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        bufferRef.current += chunk;

        // If we haven't captured SEO yet, attempt to find the markers in the buffer
        if (!seoCaptured) {
          const startIdx = bufferRef.current.indexOf('<!--SEO_START');
          const endIdx = bufferRef.current.indexOf('SEO_END-->');
          if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            // extract JSON between the markers
            const between = bufferRef.current.slice(startIdx, endIdx + 'SEO_END-->'.length);
            const jsonStart = between.indexOf('\n');
            const jsonEnd = between.lastIndexOf('\n');
            // robust: find first { and last } within between
            const firstBrace = between.indexOf('{');
            const lastBrace = between.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
              const jsonText = between.slice(firstBrace, lastBrace + 1);
              try {
                const parsed = JSON.parse(jsonText);
                if (parsed.title) setTitleOverride(parsed.title);
                if (parsed.meta) setMetaOverride(parsed.meta);
              } catch (e) {
                console.warn('Failed parsing SEO JSON from stream', e);
              }
            }
            // remove the marker block from buffer so it doesn't show up in article
            bufferRef.current = bufferRef.current.slice(0, startIdx) + bufferRef.current.slice(endIdx + 'SEO_END-->'.length);
            seoCaptured = true;
          }
        }

        // Normal SSE parsing (split by double newlines)
        const parts = bufferRef.current.split(/\r?\n\r?\n/);
        bufferRef.current = parts.pop() || '';
        for (const part of parts) {
          const lines = part.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const payload = line.replace(/^data:\s*/, '');
              if (payload === '[DONE]') {
                // end marker — ignore
              } else {
                try {
                  const obj = JSON.parse(payload);
                  const choices = obj.choices || [];
                  for (const ch of choices) {
                    const delta = ch.delta || {};
                    const text = delta.content || '';
                    if (text) {
                      setContent(prev => prev + text);
                    }
                  }
                } catch (err) {
                  // not JSON — append raw
                  setContent(prev => prev + payload);
                }
              }
            } else {
              setContent(prev => prev + line + '\n');
            }
          }
        }
      }
    }

    // flush any remaining buffer (handle SEO block if it was fully in leftover)
    if (bufferRef.current.trim()) {
      // attempt SEO parse again if not captured
      if (!seoCaptured) {
        const startIdx = bufferRef.current.indexOf('<!--SEO_START');
        const endIdx = bufferRef.current.indexOf('SEO_END-->');
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          const between = bufferRef.current.slice(startIdx, endIdx + 'SEO_END-->'.length);
          const firstBrace = between.indexOf('{');
          const lastBrace = between.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const jsonText = between.slice(firstBrace, lastBrace + 1);
            try {
              const parsed = JSON.parse(jsonText);
              if (parsed.title) setTitleOverride(parsed.title);
              if (parsed.meta) setMetaOverride(parsed.meta);
            } catch (e) {
              console.warn('Failed parsing SEO JSON from leftover buffer', e);
            }
          }
          // strip it
          bufferRef.current = bufferRef.current.slice(0, startIdx) + bufferRef.current.slice(endIdx + 'SEO_END-->'.length);
          seoCaptured = true;
        }
      }
      // append whatever remains to content
      setContent(prev => prev + bufferRef.current);
    }

    setStatus('Done');
  } catch (err) {
    if (err.name === 'AbortError') {
      setStatus('Generation cancelled.');
    } else {
      setStatus('Error: ' + (err.message || String(err)));
    }
  } finally {
    setStreaming(false);
    controllerRef.current = null;
  }
}

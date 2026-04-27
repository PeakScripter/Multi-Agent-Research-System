const BASE = "";  // proxied by Vite

export async function startResearch(topic, { onProgress, onResult, onError } = {}) {
  const res = await fetch(`${BASE}/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, stream: true, generate_docx: true }),
  });
  await consumeSSE(res, { onProgress, onResult, onError });
}

export async function startCompare(topicA, topicB) {
  const res = await fetch(`${BASE}/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic_a: topicA, topic_b: topicB }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function searchRAG(query, limit = 5) {
  const res = await fetch(`${BASE}/rag/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getRecentRAG(limit = 10) {
  const res = await fetch(`${BASE}/rag/recent?limit=${limit}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getHistory() {
  const res = await fetch(`${BASE}/history`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteHistory(id) {
  const res = await fetch(`${BASE}/history/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function transcribeVoice(audioBlob, { onProgress, onResult, onError } = {}) {
  const form = new FormData();
  form.append("file", audioBlob, "recording.webm");
  form.append("auto_research", "true");
  form.append("stream", "true");
  const res = await fetch(`${BASE}/voice?stream=true&auto_research=true`, {
    method: "POST",
    body: form,
  });
  await consumeSSE(res, { onProgress, onResult, onError });
}

export async function synthesizeSpeech(text) {
  const res = await fetch(`${BASE}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function getStatus() {
  const res = await fetch(`${BASE}/status`);
  return res.json();
}

export async function getDocuments() {
  const res = await fetch(`${BASE}/documents`);
  return res.json();
}

async function consumeSSE(res, { onProgress, onResult, onError }) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop();
    for (const part of parts) {
      if (!part.startsWith("data: ")) continue;
      try {
        const event = JSON.parse(part.slice(6));
        if (event.type === "progress" && onProgress) onProgress(event);
        if (event.type === "result" && onResult) onResult(event.result);
        if (event.type === "error" && onError) onError(event.error);
      } catch (_) {}
    }
  }
}

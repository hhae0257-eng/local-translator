export const BACKENDS = {
  lmstudio: { label: "LM Studio", url: "http://localhost:1234/v1" },
  ollama:   { label: "Ollama",    url: "http://localhost:11434/v1" },
};

let BASE = BACKENDS.lmstudio.url;
let cachedFetch = null;

// Call this when the user switches backends.
export function setBase(url) {
  BASE = url;
  cachedFetch = null; // force fetcher re-init for the new origin
}

async function getFetcher() {
  if (cachedFetch) return cachedFetch;
  try {
    if (typeof window !== "undefined" && window.__TAURI_INTERNALS__) {
      const mod = await import("@tauri-apps/plugin-http");
      cachedFetch = mod.fetch;
      return cachedFetch;
    }
  } catch (e) {
    console.warn("Tauri http plugin unavailable, using window.fetch", e);
  }
  cachedFetch = window.fetch.bind(window);
  return cachedFetch;
}

// Common headers: Origin spoofed to http://localhost so Ollama's CORS
// middleware accepts the request (Tauri's HTTP plugin otherwise sends
// Origin: tauri://localhost which Ollama blocks with 403).
function commonHeaders() {
  return {
    "Content-Type": "application/json",
    "Origin": "http://localhost",
  };
}

// Label for the currently active backend (used in error messages).
function backendLabel() {
  return Object.values(BACKENDS).find((b) => b.url === BASE)?.label ?? "서버";
}

export async function listModels() {
  const f = await getFetcher();
  const r = await f(`${BASE}/models`, {
    method: "GET",
    headers: commonHeaders(),
  });
  if (!r.ok) throw new Error(`${backendLabel()} /models returned ${r.status}`);
  const data = await r.json();
  return (data.data ?? []).map((m) => m.id);
}

export async function translate({ model, system, user, signal }) {
  const f = await getFetcher();
  const body = {
    model,
    messages: [
      { role: "system", content: system },
      // Prepend /no_think to the user message so Qwen3-style thinking models
      // skip chain-of-thought and output the translation directly.
      { role: "user", content: `/no_think\n\n${user}` },
    ],
    temperature: 0.3,
    top_p: 0.9,
    max_tokens: 4096,
    stream: false,
  };

  const r = await f(`${BASE}/chat/completions`, {
    method: "POST",
    headers: commonHeaders(),
    body: JSON.stringify(body),
    signal,
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`${backendLabel()} ${r.status}: ${text.slice(0, 200)}`);
  }

  const data = await r.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  return content.trim();
}

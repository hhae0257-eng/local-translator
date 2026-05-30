const BASE = "http://localhost:1234/v1";

let cachedFetch = null;

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

export async function listModels() {
  const f = await getFetcher();
  const r = await f(`${BASE}/models`, { method: "GET" });
  if (!r.ok) throw new Error(`LM Studio /models returned ${r.status}`);
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
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`LM Studio ${r.status}: ${text.slice(0, 200)}`);
  }

  const data = await r.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  return content.trim();
}

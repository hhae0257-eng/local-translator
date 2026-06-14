// Ollama OpenAI-compatible API
const BASE = "http://localhost:11434/v1";

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

// Spoof Origin to http://localhost so Ollama's CORS middleware accepts the
// request. Tauri's HTTP plugin otherwise sends Origin: tauri://localhost
// which Ollama blocks with 403.
function commonHeaders() {
  return {
    "Content-Type": "application/json",
    "Origin": "http://localhost",
  };
}

// Parse a backend error into a user-friendly Korean message.
function friendlyError(status, rawText) {
  let json = null;
  try { json = JSON.parse(rawText); } catch { /* not JSON */ }

  const apiMsg = json?.error?.message ?? "";

  if (/model.*not found|pull the model/i.test(apiMsg)) {
    return "모델이 설치되지 않았습니다. 터미널에서 ollama pull [모델명]을 실행해주세요.";
  }
  if (/context.*(length|window)|token.*limit/i.test(apiMsg)) {
    return "입력 텍스트가 너무 깁니다. 내용을 줄여주세요.";
  }
  if (status === 403) {
    return "접근 거부 (403). OLLAMA_ORIGINS 환경변수를 확인해주세요.";
  }
  if (status === 404) {
    return "모델을 찾을 수 없습니다. 터미널에서 ollama pull [모델명]을 실행해주세요.";
  }
  if (status === 500) {
    return "Ollama 서버 오류 (500). ollama 상태를 확인해주세요.";
  }
  if (apiMsg) return apiMsg.slice(0, 150);
  return `오류 ${status} — Ollama에서 요청을 처리할 수 없습니다.`;
}

export async function listModels() {
  const f = await getFetcher();
  const r = await f(`${BASE}/models`, {
    method: "GET",
    headers: commonHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`Ollama /models 오류 (${r.status})`);
  const data = await r.json();
  return (data.data ?? []).map((m) => m.id);
}

export async function translate({ model, system, user, signal }) {
  const f = await getFetcher();
  const body = {
    model,
    messages: [
      { role: "system", content: system },
      // Prepend /no_think so Qwen3-style thinking models skip chain-of-thought
      // and output the translation directly.
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
    throw new Error(friendlyError(r.status, text));
  }

  const data = await r.json();
  const content = data.choices?.[0]?.message?.content ?? "";
  return content.trim();
}

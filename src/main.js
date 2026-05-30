import { listModels, translate } from "./lmstudio.js";
import { buildSystemPrompt, STYLES } from "./prompts.js";
import { detectLang, LANG_LABEL } from "./detect.js";

const $ = (id) => document.getElementById(id);
const els = {
  input: $("input"),
  modelSelect: $("model-select"),
  refreshBtn: $("refresh-models"),
  sourceLang: $("source-lang"),
  targetLang: $("target-lang"),
  swap: $("swap"),
  status: $("status"),
  charCount: $("char-count"),
  detectedLang: $("detected-lang"),
  translateBtn: $("translate-btn"),
  outputs: Object.fromEntries(STYLES.map((s) => [s, $(`out-${s}`)])),
};

// ── CPP (Content Creator Program) 설정 ──
const cpp = {
  toggle: $("cpp-toggle"),
  body:   $("cpp-body"),
  caret:  $("cpp-caret"),
  badge:  $("cpp-badge"),
  tags:   $("cpp-tags"),
  phrase: $("cpp-phrase"),
};

function getCppConfig() {
  const tags   = cpp.tags.value.trim();
  const phrase = cpp.phrase.value.trim();
  const pos    = document.querySelector('input[name="cpp-pos"]:checked')?.value ?? "after";
  return { tags, phrase, pos };
}

function updateCppBadge() {
  const { tags, phrase } = getCppConfig();
  cpp.badge.classList.toggle("hidden", !(tags || phrase));
}

// 태그를 번역 결과 앞/뒤에 삽입
function applyCppTags(text, config) {
  if (!config.tags) return text;
  return config.pos === "before"
    ? `${config.tags}\n\n${text}`
    : `${text}\n\n${config.tags}`;
}

let currentController = null;

async function refreshModels() {
  setStatus("연결 시도 중…", null);
  try {
    const models = await listModels();
    els.modelSelect.innerHTML = "";
    if (models.length === 0) {
      const opt = document.createElement("option");
      opt.textContent = "(모델이 로드되지 않음)";
      opt.disabled = true;
      els.modelSelect.append(opt);
      setStatus("LM Studio는 떴지만 로드된 모델 없음", "bad");
      return;
    }
    for (const m of models) {
      const opt = document.createElement("option");
      opt.value = m;
      opt.textContent = m;
      els.modelSelect.append(opt);
    }
    const saved = localStorage.getItem("lt.model");
    if (saved && models.includes(saved)) els.modelSelect.value = saved;
    setStatus(`연결됨 · ${models.length}개 모델`, "ok");
  } catch (e) {
    const msg = String(e?.message ?? e);
    let hint = "";
    if (/fetch|Failed|TypeError/i.test(msg)) hint = " (서버 안 켜짐?)";
    else if (/CORS|origin/i.test(msg)) hint = " (CORS)";
    else if (/Forbidden|403|denied/i.test(msg)) hint = " (Tauri 권한)";
    setStatus(`연결 실패${hint} · ⟳ 클릭 재시도`, "bad");
    console.error("refreshModels failed:", e);
  }
}

function setStatus(text, kind) {
  els.status.textContent = text;
  els.status.classList.remove("ok", "bad");
  if (kind) els.status.classList.add(kind);
}

function updateCharCount() {
  const n = els.input.value.length;
  els.charCount.textContent = `${n}자`;
}

function updateDetected() {
  if (els.sourceLang.value !== "auto") {
    els.detectedLang.textContent = "";
    return;
  }
  const guess = detectLang(els.input.value);
  els.detectedLang.textContent = guess ? `감지됨: ${LANG_LABEL[guess]}` : "";
}

async function runTranslation() {
  const text = els.input.value.trim();
  if (!text) return;

  const model = els.modelSelect.value;
  if (!model) {
    setStatus("모델을 먼저 선택하세요", "bad");
    return;
  }
  localStorage.setItem("lt.model", model);

  let source = els.sourceLang.value;
  if (source === "auto") {
    source = detectLang(text) ?? "auto";
  }
  const target = els.targetLang.value;

  if (currentController) currentController.abort();
  currentController = new AbortController();
  const { signal } = currentController;

  els.translateBtn.disabled = true;

  for (const style of STYLES) {
    const el = els.outputs[style];
    el.textContent = "";
    el.classList.add("loading");
    el.classList.remove("error");
    const lat = document.querySelector(`.latency[data-key="${style}"]`);
    if (lat) lat.textContent = "";
  }

  setStatus(`번역 중… (순차 ${STYLES.length}개)`, null);

  const cppConfig = getCppConfig();

  // Sequential calls — avoids LM Studio 500 errors when the model cannot
  // handle concurrent requests. Each style is awaited before the next starts.
  for (const style of STYLES) {
    if (signal.aborted) break;
    const start = performance.now();
    const el = els.outputs[style];
    try {
      const system = buildSystemPrompt(style, source, target, cppConfig.phrase);
      const out = await translate({ model, system, user: text, signal });
      el.textContent = applyCppTags(stripThinkBlock(out), cppConfig);
      el.classList.remove("loading");
      const ms = Math.round(performance.now() - start);
      const lat = document.querySelector(`.latency[data-key="${style}"]`);
      if (lat) lat.textContent = `${(ms / 1000).toFixed(1)}s`;
    } catch (e) {
      if (e.name === "AbortError") {
        el.classList.remove("loading");
        el.textContent = "(취소됨)";
        break;
      }
      el.textContent = `오류: ${e.message}`;
      el.classList.remove("loading");
      el.classList.add("error");
    }
  }
  setStatus("연결됨 · 완료", "ok");
  els.translateBtn.disabled = false;
}

// Strip <think>...</think> blocks if a reasoning model emits them in `content`
// despite /no_think.
function stripThinkBlock(text) {
  return text.replace(/<think>[\s\S]*?<\/think>\s*/gi, "").trim();
}

function bindEvents() {
  els.input.addEventListener("input", () => {
    updateCharCount();
    updateDetected();
  });

  els.sourceLang.addEventListener("change", () => {
    localStorage.setItem("lt.source", els.sourceLang.value);
    updateDetected();
  });

  els.targetLang.addEventListener("change", () => {
    localStorage.setItem("lt.target", els.targetLang.value);
  });

  els.modelSelect.addEventListener("change", () => {
    localStorage.setItem("lt.model", els.modelSelect.value);
  });

  els.swap.addEventListener("click", () => {
    const s = els.sourceLang.value;
    const t = els.targetLang.value;
    if (s === "auto") return;
    els.sourceLang.value = t;
    els.targetLang.value = s;
    localStorage.setItem("lt.source", els.sourceLang.value);
    localStorage.setItem("lt.target", els.targetLang.value);
  });

  els.translateBtn.addEventListener("click", runTranslation);
  els.refreshBtn.addEventListener("click", refreshModels);
  els.status.addEventListener("click", refreshModels);
  els.status.style.cursor = "pointer";

  // CPP 토글
  cpp.toggle.addEventListener("click", () => {
    const open = cpp.body.classList.toggle("open");
    cpp.caret.classList.toggle("open", open);
  });

  // CPP 입력 저장
  cpp.tags.addEventListener("input", () => {
    updateCppBadge();
    localStorage.setItem("lt.cpp.tags", cpp.tags.value);
  });
  cpp.phrase.addEventListener("input", () => {
    updateCppBadge();
    localStorage.setItem("lt.cpp.phrase", cpp.phrase.value);
  });
  document.querySelectorAll('input[name="cpp-pos"]').forEach((r) =>
    r.addEventListener("change", () => localStorage.setItem("lt.cpp.pos", r.value))
  );

  els.input.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      runTranslation();
    }
  });

  document.querySelectorAll("button.copy").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const key = btn.dataset.key;
      const txt = els.outputs[key].textContent;
      if (!txt) return;
      try {
        await navigator.clipboard.writeText(txt);
        const orig = btn.textContent;
        btn.textContent = "복사됨";
        setTimeout(() => (btn.textContent = orig), 1200);
      } catch (e) {
        console.error(e);
      }
    });
  });
}

function restorePrefs() {
  const s = localStorage.getItem("lt.source");
  const t = localStorage.getItem("lt.target");
  if (s) els.sourceLang.value = s;
  if (t) els.targetLang.value = t;

  // CPP 설정 복원
  const savedTags   = localStorage.getItem("lt.cpp.tags");
  const savedPhrase = localStorage.getItem("lt.cpp.phrase");
  const savedPos    = localStorage.getItem("lt.cpp.pos");
  if (savedTags)   cpp.tags.value   = savedTags;
  if (savedPhrase) cpp.phrase.value = savedPhrase;
  if (savedPos) {
    const radio = document.querySelector(`input[name="cpp-pos"][value="${savedPos}"]`);
    if (radio) radio.checked = true;
  }
  updateCppBadge();
}

restorePrefs();
bindEvents();
updateCharCount();
refreshModels();

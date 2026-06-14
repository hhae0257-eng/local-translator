import { listModels, translate } from "./lmstudio.js";
import { buildSystemPrompt, STYLES } from "./prompts.js";
import { detectLang, LANG_LABEL } from "./detect.js";
import { saveEntry, getEntries, removeEntry, clearAll } from "./history.js";

// Injected by Vite at build time from package.json
const APP_VERSION = __APP_VERSION__;
const GITHUB_REPO = "hhae0257-eng/local-translator";

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

// ── History drawer ──
const hist = {
  btn:      $("history-btn"),
  drawer:   $("history-drawer"),
  list:     $("history-list"),
  search:   $("history-search"),
  clearBtn: $("history-clear-btn"),
  closeBtn: $("history-close-btn"),
};

let _histEntries = [];

function relativeTime(iso) {
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1)  return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 8)  return `${d}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}

function buildHistItem(entry) {
  const item = document.createElement("div");
  item.className = "hist-item";

  const row = document.createElement("div");
  row.className = "hist-row";

  const time = document.createElement("span");
  time.className = "hist-time";
  time.textContent = relativeTime(entry.date);

  const pair = document.createElement("span");
  pair.className = "hist-pair";
  pair.textContent = `${LANG_LABEL[entry.source] ?? entry.source} → ${LANG_LABEL[entry.target] ?? entry.target}`;

  const del = document.createElement("button");
  del.className = "hist-del";
  del.textContent = "✕";
  del.title = "삭제";
  del.addEventListener("click", (e) => {
    e.stopPropagation();
    removeEntry(entry.id).then(() => {
      _histEntries = _histEntries.filter((x) => x.id !== entry.id);
      item.remove();
    });
  });

  row.append(time, pair, del);

  const preview = document.createElement("div");
  preview.className = "hist-preview";
  preview.textContent = entry.inputText.length > 80
    ? entry.inputText.slice(0, 80) + "…"
    : entry.inputText;

  const model = document.createElement("div");
  model.className = "hist-model";
  model.textContent = entry.model;

  item.append(row, preview, model);
  item.addEventListener("click", () => restoreEntry(entry));
  return item;
}

function renderHistList(entries) {
  hist.list.innerHTML = "";
  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "hist-empty";
    empty.textContent = "번역 기록이 없습니다.";
    hist.list.append(empty);
    return;
  }
  for (const e of entries) hist.list.append(buildHistItem(e));
}

function restoreEntry(entry) {
  els.input.value = entry.inputText;
  if (entry.source) els.sourceLang.value = entry.source;
  if (entry.target) els.targetLang.value = entry.target;
  for (const style of STYLES) {
    const el = els.outputs[style];
    el.classList.remove("loading", "error");
    el.textContent = entry.outputs?.[style] ?? "";
  }
  updateCharCount();
  updateDetected();
  closeHistory();
}

async function openHistory() {
  hist.drawer.classList.add("open");
  hist.drawer.setAttribute("aria-hidden", "false");
  hist.btn.classList.add("active");
  hist.search.value = "";
  hist.list.textContent = "로딩 중…";
  try {
    _histEntries = await getEntries(200);
    renderHistList(_histEntries);
  } catch (e) {
    hist.list.textContent = "기록을 불러올 수 없습니다.";
    console.error(e);
  }
}

function closeHistory() {
  hist.drawer.classList.remove("open");
  hist.drawer.setAttribute("aria-hidden", "true");
  hist.btn.classList.remove("active");
}

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
      opt.textContent = "(설치된 모델 없음)";
      opt.disabled = true;
      els.modelSelect.append(opt);
      setStatus("Ollama 연결됨 · 모델 없음 (ollama pull 필요)", "bad");
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
    const hint = /fetch|Failed|TypeError/i.test(msg) ? " (Ollama 안 켜짐?)" : "";
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

  // Sequential calls — one at a time to avoid Ollama overload.
  let errorCount = 0;
  let aborted = false;
  for (const style of STYLES) {
    if (signal.aborted) { aborted = true; break; }
    const start = performance.now();
    const el = els.outputs[style];
    const lat = document.querySelector(`.latency[data-key="${style}"]`);
    try {
      const system = buildSystemPrompt(style, source, target, cppConfig.phrase);
      const out = await translate({ model, system, user: text, signal });
      el.textContent = applyCppTags(stripThinkBlock(out), cppConfig);
      el.classList.remove("loading");
      if (lat) lat.textContent = `${((performance.now() - start) / 1000).toFixed(1)}s`;
    } catch (e) {
      if (e.name === "AbortError") {
        el.classList.remove("loading");
        el.textContent = "(취소됨)";
        aborted = true;
        break;
      }
      el.textContent = `오류: ${e.message}`;
      el.classList.remove("loading");
      el.classList.add("error");
      errorCount++;
    }
  }

  // Clean up any panels that never ran because we broke out of the loop.
  if (aborted) {
    for (const style of STYLES) {
      const el = els.outputs[style];
      if (el.classList.contains("loading")) {
        el.classList.remove("loading");
        el.textContent = "(취소됨)";
      }
    }
  }

  if (aborted) {
    setStatus("번역 취소됨", null);
  } else if (errorCount > 0) {
    setStatus(`연결됨 · 완료 (${errorCount}개 오류)`, "bad");
  } else {
    setStatus("연결됨 · 완료", "ok");
  }
  els.translateBtn.disabled = false;

  // Save to history if at least one output succeeded.
  if (!aborted) {
    const validOutputs = {};
    for (const style of STYLES) {
      const el = els.outputs[style];
      if (!el.classList.contains("error") && el.textContent) {
        validOutputs[style] = el.textContent;
      }
    }
    if (Object.keys(validOutputs).length > 0) {
      saveEntry({ inputText: text, source, target, model, outputs: validOutputs })
        .catch(console.error);
    }
  }
}

// Strip <think>...</think> blocks if a reasoning model emits them despite /no_think.
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

  // History
  hist.btn.addEventListener("click", () =>
    hist.drawer.classList.contains("open") ? closeHistory() : openHistory()
  );
  hist.closeBtn.addEventListener("click", closeHistory);
  hist.clearBtn.addEventListener("click", async () => {
    if (!confirm("번역 기록을 전체 삭제할까요?")) return;
    await clearAll();
    _histEntries = [];
    renderHistList([]);
  });
  hist.search.addEventListener("input", () => {
    const q = hist.search.value.toLowerCase();
    renderHistList(
      q ? _histEntries.filter((e) =>
        e.inputText.toLowerCase().includes(q) ||
        Object.values(e.outputs ?? {}).some((v) => v.toLowerCase().includes(q))
      ) : _histEntries
    );
  });

  document.querySelectorAll("button.copy").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const key = btn.dataset.key;
      const el = els.outputs[key];
      if (el.classList.contains("error") || el.classList.contains("loading")) return;
      const txt = el.textContent;
      if (!txt || txt === "(취소됨)") return;
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

// ── 버전 표시 ──
function showVersion() {
  const el = document.getElementById("app-version");
  if (el) el.textContent = `v${APP_VERSION}`;
}

// ── GitHub 최신 릴리즈 확인 ──
async function checkForUpdates() {
  try {
    const res = await window.fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { headers: { Accept: "application/vnd.github+json" } }
    );
    if (!res.ok) return;
    const data = await res.json();
    const latest = (data.tag_name ?? "").replace(/^v/, "");
    if (latest && latest !== APP_VERSION) {
      showUpdateBanner(latest, data.html_url);
    }
  } catch {
    // 오프라인이거나 GitHub 접속 실패 시 조용히 무시
  }
}

function showUpdateBanner(newVer, url) {
  document.getElementById("update-banner")?.remove();

  const banner = document.createElement("div");
  banner.id = "update-banner";
  banner.className = "update-banner";

  const msg = document.createElement("span");
  msg.textContent = `🎉 새 버전 v${newVer} 이 출시됐습니다! `;

  const link = document.createElement("a");
  link.textContent = "GitHub에서 다운로드";
  link.setAttribute("href", url);
  link.setAttribute("target", "_blank");
  link.setAttribute("rel", "noopener");

  const dismiss = document.createElement("button");
  dismiss.className = "update-dismiss";
  dismiss.title = "닫기";
  dismiss.textContent = "✕";
  dismiss.addEventListener("click", () => banner.remove());

  banner.append(msg, link, dismiss);
  document.body.prepend(banner);
}

restorePrefs();
bindEvents();
updateCharCount();
showVersion();
refreshModels();

// 3초 뒤 업데이트 체크 (앱 로딩 끝난 후)
setTimeout(checkForUpdates, 3000);

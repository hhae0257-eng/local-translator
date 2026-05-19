# Local Translator

A privacy-first desktop translator that produces **three style variations simultaneously** — natural, social-media, and formal — entirely on your own machine using [LM Studio](https://lmstudio.ai/) as the local LLM backend.

> 한국어 안내: [README.ko.md](./README.ko.md)

<!-- TODO: add screenshot at docs/preview.png and uncomment
![Local Translator preview](./docs/preview.png)
-->

## Features

- 🔒 **100% local** — your text never leaves your computer.
- ✨ **Three styles at once** — natural / SNS / formal, side by side.
- 🌐 **Multilingual** — Korean ↔ English / Japanese / Chinese (more by adding to the language list).
- 🚀 **Fast** — parallel inference using LM Studio's `--parallel` mode.
- 🖥️ **Native desktop** — Tauri 2 (Rust + Web), small binary, no Electron bloat.

## Requirements

- **OS**: Windows 10/11, macOS, or Linux
- **GPU**: 8 GB+ VRAM recommended (works on CPU too, just slower)
- **RAM**: 16 GB+ (for 14B-class models; smaller models work with 8 GB)
- **Disk**: ~10 GB for the model + ~1 GB for the app

## Quick start (5 minutes)

### 1. Install LM Studio

Download from <https://lmstudio.ai/> and install. LM Studio is a free desktop app that runs LLMs locally and exposes an OpenAI-compatible HTTP API.

### 2. Download a translation model

Open LM Studio and search for one of:

| Model | Size | Notes |
|---|---|---|
| `qwen/qwen3-14b` (Q4_K_M) | 9 GB | **Recommended.** Strong multilingual, fast on modern GPUs. |
| `bartowski/Qwen2.5-14B-Instruct-GGUF` (Q5_K_M) | 10 GB | Solid alternative. |
| `LGAI-EXAONE/EXAONE-3.5-7.8B-Instruct` | 5 GB | Best Korean output. |
| `lmstudio-community/gemma-3-12b-it-GGUF` | 7 GB | Lighter option. |

Click **Download**. Wait for it to finish.

### 3. Load the model and start the server

In LM Studio:

1. Go to the **Developer** tab (or `</>` icon).
2. Click **Select a model to load** → choose the model you downloaded.
3. In the load options, set **Context Length: 8192** and **Parallel: 3** (or use the CLI command below).
4. Click **Start Server** at the top. The status should show **Running** on port `1234`.

**Or use the LM Studio CLI** (recommended — guarantees correct settings):

```powershell
lms load qwen/qwen3-14b --gpu max --context-length 8192 --parallel 3 -y
lms server start
```

> ⚠️ **`--parallel 3` is required.** The app sends 3 requests at once (natural / SNS / formal). Without `--parallel`, LM Studio rejects the 2nd and 3rd with `500 Internal Server Error`.

### 4. Run Local Translator

```powershell
git clone https://github.com/hhae0257-eng/local-translator
cd local-translator
npm install
npx tauri dev
```

First Rust build takes ~5 minutes. Subsequent runs start in seconds.

The app window opens. In the top bar select your downloaded model from the dropdown, type a sentence, hit **Ctrl+Enter**.

## Building a release binary

```powershell
npx tauri build
```

The MSI/EXE installer ends up in `src-tauri/target/release/bundle/`.

## How it works

```
┌──────────────────┐   3 HTTP requests   ┌──────────────────┐
│  Tauri Webview   │  ─────────────────► │   LM Studio API  │
│ (Vanilla JS UI)  │   (different sys    │   localhost:1234 │
│                  │    prompts per      │                  │
│                  │    style)           │  Qwen3-14B etc.  │
└──────────────────┘                     └──────────────────┘
```

- `src/prompts.js` — three system prompts: natural, SNS, formal
- `src/lmstudio.js` — OpenAI-compatible client (uses Tauri's HTTP plugin to bypass CORS)
- `src/main.js` — UI wiring, parallel fan-out via `Promise.allSettled`
- `src-tauri/` — Rust shell, single window, http plugin enabled

## Troubleshooting

| Symptom | Fix |
|---|---|
| Status bar shows **연결 실패 / 서버 안 켜짐** | LM Studio's Local Server is off. Click ⟳ after starting it (or run `lms server start`). |
| One or two of the three panels show **500 Internal Server Error** | Model was loaded without `--parallel 3`. Reload: `lms load <model> --parallel 3 -y`. |
| All three panels are empty / contain only newlines | Your model is a "thinking" model (Qwen3, DeepSeek-R1, etc.) and used the whole token budget on hidden reasoning. The app already appends `/no_think` — make sure you didn't override the prompt. Increase `max_tokens` in `src/lmstudio.js` as a backup. |
| Build fails with `STATUS_ACCESS_VIOLATION` while compiling `zerovec` | Known intermittent rustc bug. The repo ships `src-tauri/.cargo/config.toml` with `jobs = 1` to work around it. If you removed that, restore it. |
| Window opens but model dropdown is empty | LM Studio is running but no model is loaded. Click LM Studio → Developer → load a model, then click ⟳ in the app. |

## License

MIT — see [LICENSE](./LICENSE).

## Acknowledgments

- [Tauri](https://tauri.app/) — desktop shell
- [LM Studio](https://lmstudio.ai/) — local LLM runtime
- [Qwen](https://qwenlm.github.io/), [Gemma](https://ai.google.dev/gemma), [EXAONE](https://www.lgresearch.ai/) — open-weight model families

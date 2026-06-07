# Local Translator

A privacy-first desktop translator that produces **three style variations simultaneously** — natural, social-media, and formal — entirely on your own machine using [Ollama](https://ollama.com/) as the local LLM backend.

> 한국어 안내: [README.ko.md](./README.ko.md)

<!-- TODO: add screenshot at docs/preview.png and uncomment
![Local Translator preview](./docs/preview.png)
-->

## Features

- 🔒 **100% local** — your text never leaves your computer.
- ✨ **Three styles at once** — natural / SNS / formal, side by side.
- 🌐 **Multilingual** — Korean ↔ English / Japanese / Chinese.
- 📋 **CPP support** — auto-append mandatory disclosure tags and phrases (for content creators).
- 🔔 **Auto-update check** — notifies you when a new version is available on startup.
- 🖥️ **Native desktop** — Tauri 2 (Rust + Web), small binary, no Electron bloat.

## Requirements

- **OS**: Windows 10/11, macOS, or Linux
- **GPU**: 8 GB+ VRAM recommended (works on CPU too, just slower)
- **RAM**: 16 GB+ (for 14B-class models; smaller models work with 8 GB)
- **Disk**: ~5–10 GB per model

## Quick start

### Option A — Download the installer (Windows)

Go to [Releases](https://github.com/hhae0257-eng/local-translator/releases) and download the latest `.exe` (NSIS) or `.msi` installer. Run it and follow the prompts.

Then follow steps 1–3 below to set up Ollama.

### Option B — Run from source

```powershell
git clone https://github.com/hhae0257-eng/local-translator
cd local-translator
npm install
npx tauri dev
```

First Rust build takes ~5 minutes. Subsequent runs start in seconds.

---

## Setting up Ollama

### 1. Install Ollama

Download from <https://ollama.com/> and install. Ollama runs as a lightweight background service with an OpenAI-compatible API.

### 2. Pull a translation model

Open a terminal and run one of:

```powershell
ollama pull qwen2.5:14b        # Recommended — strong multilingual, ~9 GB
ollama pull qwen3:14b          # Newer, slightly larger
ollama pull gemma3:12b         # Lighter option, ~7 GB
ollama pull exaone3.5:7.8b     # Best Korean output, ~5 GB
```

Any model that fits in your VRAM will work. Smaller models (7B) are faster; larger models (14B+) translate more naturally.

### 3. Allow the app to connect (Windows only)

Ollama rejects requests from desktop apps by default. Set this environment variable **once**:

```powershell
[System.Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "*", "User")
```

Then **restart Ollama** (right-click the tray icon → Quit, then relaunch).

> On macOS/Linux, Ollama usually accepts local connections without extra config.

### 4. Launch Local Translator

Open the app. It connects to Ollama automatically on startup. Select a model from the dropdown, type your text, and press **Ctrl+Enter**.

---

## How it works

```
┌──────────────────┐  3 sequential HTTP requests  ┌──────────────┐
│  Tauri Webview   │  ──────────────────────────► │    Ollama    │
│ (Vanilla JS UI)  │  different system prompt      │  :11434/v1  │
│                  │  per style (natural/SNS/      │              │
│                  │  formal), one at a time       │  Qwen / etc. │
└──────────────────┘                               └──────────────┘
```

- `src/prompts.js` — three system prompts: natural, SNS, formal; CPP phrase injection
- `src/lmstudio.js` — Ollama OpenAI-compatible client (uses Tauri's HTTP plugin)
- `src/main.js` — UI wiring, sequential translation loop, version/update check
- `src-tauri/` — Rust shell, single window, http plugin enabled

## CPP (Content Creator Program)

Click the **📋 CPP 설정** panel in the input area to configure:

- **필수 태그** — hashtags appended to every translation output (e.g. `#ad #sponsored`)
- **필수 문구** — a disclosure phrase the AI weaves naturally into the translation text
- **위치** — place tags before or after the translated content

## Building a release binary

```powershell
npx tauri build
```

The MSI/EXE installer is output to `src-tauri/target/release/bundle/`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Status bar shows **연결 실패** | Ollama isn't running. Start it from the Start menu or run `ollama serve`. |
| **403** error in status | `OLLAMA_ORIGINS` env variable not set. Run the PowerShell command in step 3, restart Ollama. |
| Model dropdown is empty | Ollama is running but no models are installed. Run `ollama pull <model>` then click ⟳. |
| Translation output is empty | Model produced only hidden reasoning (Qwen3 thinking mode). The app sends `/no_think` automatically — try restarting Ollama if it persists. |
| Build fails with `STATUS_ACCESS_VIOLATION` | Intermittent rustc bug. The repo includes `src-tauri/.cargo/config.toml` with `jobs = 1` as a workaround. |
| `not found: cargo` when running dev | Restart your terminal after installing Rust. |

## License

MIT — see [LICENSE](./LICENSE).

## Acknowledgments

- [Tauri](https://tauri.app/) — desktop shell
- [Ollama](https://ollama.com/) — local LLM runtime
- [Qwen](https://qwenlm.github.io/), [Gemma](https://ai.google.dev/gemma), [EXAONE](https://www.lgresearch.ai/) — open-weight model families

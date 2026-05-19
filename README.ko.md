# Local Translator

내 컴퓨터 안에서만 동작하는 데스크톱 번역기. 입력한 문장을 **자연어 / SNS / 격식체** 세 가지 스타일로 동시에 번역해줍니다. 백엔드는 [LM Studio](https://lmstudio.ai/)로 돌리는 로컬 LLM이라, 텍스트가 외부 서버로 나가지 않습니다.

> English: [README.md](./README.md)

<!-- TODO: 스크린샷 추가하면 아래 주석 해제
![앱 미리보기](./docs/preview.png)
-->

## 특징

- 🔒 **완전 로컬** — 입력한 문장이 외부 서버로 전송되지 않음
- ✨ **3가지 스타일 동시 출력** — 자연어 · SNS · Formal
- 🌐 **다국어** — 한↔영↔일↔중 (코드 수정으로 더 추가 가능)
- 🚀 **빠름** — LM Studio의 `--parallel` 모드로 동시 추론
- 🖥️ **가벼운 네이티브 앱** — Tauri 2 (Rust + Web). Electron보다 작음

## 동작 환경

- **OS**: Windows 10/11, macOS, Linux
- **GPU**: VRAM 8GB+ 권장 (CPU만으로도 동작은 하지만 느림)
- **RAM**: 16GB 이상 권장 (14B급 모델 기준. 더 작은 모델은 8GB로도 가능)
- **디스크**: 모델용 ~10GB + 앱 빌드용 ~1GB

---

## 빠른 시작 (5분 가이드)

### 1단계 — LM Studio 설치

[lmstudio.ai](https://lmstudio.ai/)에서 본인 OS에 맞는 인스톨러 받아서 설치하세요. 무료입니다. 설치 후 한 번 실행해서 초기 화면이 뜨면 OK.

> LM Studio는 GPT 같은 LLM을 내 컴퓨터에서 돌리는 도구예요. 이 앱은 LM Studio가 제공하는 로컬 HTTP API를 호출하는 방식으로 동작합니다.

### 2단계 — 번역용 모델 다운로드

LM Studio 좌측 메뉴의 **🔍 Discover (검색)** 탭에서 아래 중 하나를 찾아 **Download** 클릭:

| 모델 이름 | 크기 | 추천 이유 |
|---|---|---|
| `qwen/qwen3-14b` (Q4_K_M) | 9GB | **가장 추천.** 한/영/일/중 모두 잘함. 빠름. |
| `bartowski/Qwen2.5-14B-Instruct-GGUF` (Q5_K_M) | 10GB | 안정적인 대안 |
| `LGAI-EXAONE/EXAONE-3.5-7.8B-Instruct` | 5GB | 한국어 자연스러움 최강 |
| `lmstudio-community/gemma-3-12b-it-GGUF` | 7GB | 가벼운 옵션 |

> 모델 다운로드는 9~10GB라 인터넷 속도에 따라 15분~2시간 정도 걸릴 수 있어요.

### 3단계 — 모델 로드 + 로컬 서버 켜기

**방법 A: GUI로 (초보자용)**

1. LM Studio 좌측 메뉴의 **`</>`** (Developer) 탭 클릭
2. 상단 **"Select a model to load"** 클릭 → 방금 받은 모델 선택
3. 로드 옵션 화면이 뜨면:
   - **Context Length**: `8192`
   - **Parallel**: `3` ← **이거 중요!** (안 하면 오류남)
   - **GPU Offload**: `Max`
4. **Load Model** 클릭, 모델이 메모리에 올라가길 기다림
5. 상단 좌측의 토글을 **Running** (초록 점) 으로
6. **Port가 `1234`**인지 확인

**방법 B: 터미널로 (한 번에 끝)**

PowerShell에서:
```powershell
lms load qwen/qwen3-14b --gpu max --context-length 8192 --parallel 3 -y
lms server start
```

> ⚠️ **왜 `--parallel 3`이 꼭 필요한가?**
> 이 앱은 3가지 스타일을 동시에 요청합니다. LM Studio는 기본적으로 한 번에 한 요청만 처리해서, 동시 요청이 오면 2개는 `500 Internal Server Error`로 거부합니다. `--parallel 3`을 줘야 동시 3개를 처리해줍니다.

### 4단계 — 이 앱 빌드 + 실행

#### 사전 설치 (1회만)

- **Node.js 18+** — [nodejs.org](https://nodejs.org/) (LTS 추천)
- **Rust** — Windows에서는 PowerShell에 `winget install Rustlang.Rustup` 입력
- **Visual Studio C++ Build Tools** — Windows 한정. 안 깔려 있다면 [여기](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (이미 Visual Studio 깔려있으면 패스)
- **Git** — [git-scm.com](https://git-scm.com/)

#### 빌드 + 실행

```powershell
git clone https://github.com/hhae0257-eng/local-translator
cd local-translator
npm install
npx tauri dev
```

> 첫 빌드는 **Rust 컴파일 때문에 5~10분** 걸려요. 두 번째부터는 1분 안에 뜹니다.

앱 창이 열리면:
1. 우측 상단 **모델** 드롭다운에서 받은 모델 선택
2. 왼쪽 입력란에 한국어(또는 다른 언어) 문장 입력
3. **Ctrl + Enter** 또는 우측 하단 **번역** 버튼

오른쪽에 **자연어 / SNS / Formal** 세 가지 결과가 차례로 떠야 정상.

---

## 설치파일(.msi/.exe)로 만들기

```powershell
npx tauri build
```

`src-tauri/target/release/bundle/` 안에 인스톨러가 생성됩니다.

## 동작 원리

```
┌──────────────────┐  HTTP 3개   ┌──────────────────┐
│  Tauri Webview   │ ──────────► │   LM Studio API  │
│  (HTML + JS UI)  │ 각 요청마다  │   localhost:1234 │
│                  │ 다른 시스템  │                  │
│                  │ 프롬프트     │   Qwen3-14B 등   │
└──────────────────┘             └──────────────────┘
```

- `src/prompts.js` — 3가지 system prompt 정의 (자연어/SNS/Formal)
- `src/lmstudio.js` — OpenAI 호환 API 호출
- `src/main.js` — UI 로직, 병렬 호출
- `src-tauri/` — Rust 백엔드 (창 띄우고, http 플러그인 활성화)

## 자주 발생하는 문제

| 증상 | 해결 |
|---|---|
| 우측 상단에 **연결 실패 / 서버 안 켜짐** | LM Studio의 Local Server가 꺼진 상태. 켜고 ⟳ 클릭하거나 `lms server start` |
| 결과 패널 일부에 **500 Internal Server Error** | 모델 로드 시 `--parallel 3` 안 줌. `lms load <모델명> --parallel 3 -y`로 다시 |
| 모든 패널이 비어있거나 줄바꿈만 있음 | Qwen3 같은 "thinking" 모델이 reasoning에 토큰 다 써버린 것. 이 앱은 자동으로 `/no_think` 추가하지만, 프롬프트를 수정했다면 다시 추가. 또는 `src/lmstudio.js`의 `max_tokens` 늘리기 |
| 빌드 도중 `STATUS_ACCESS_VIOLATION` | rustc 간헐 버그. 저장소에 포함된 `src-tauri/.cargo/config.toml`이 `jobs = 1`로 워크어라운드 적용 중. 지웠다면 복구하세요 |
| 창은 떴는데 모델 드롭다운이 비어있음 | LM Studio는 켜져 있는데 모델이 로드 안 된 상태. LM Studio에서 모델 로드 후 앱의 ⟳ 클릭 |
| `npx tauri dev` 실행 시 `not found: cargo` | Rust 설치 후 PowerShell 재시작 안 함. 새 창에서 다시 시도 |

## 라이센스

MIT — [LICENSE](./LICENSE) 참고

## 만든 분들/도구

- [Tauri](https://tauri.app/) — 데스크톱 셸
- [LM Studio](https://lmstudio.ai/) — 로컬 LLM 실행 환경
- [Qwen](https://qwenlm.github.io/), [Gemma](https://ai.google.dev/gemma), [EXAONE](https://www.lgresearch.ai/) — 오픈 모델

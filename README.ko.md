# Local Translator

내 컴퓨터 안에서만 동작하는 데스크톱 번역기. 입력한 문장을 **자연어 / SNS / 격식체** 세 가지 스타일로 동시에 번역해줍니다. 백엔드는 [Ollama](https://ollama.com/)로 돌리는 로컬 LLM이라, 텍스트가 외부 서버로 나가지 않습니다.

> English: [README.md](./README.md)

<!-- TODO: 스크린샷 추가하면 아래 주석 해제
![앱 미리보기](./docs/preview.png)
-->

## 특징

- 🔒 **완전 로컬** — 입력한 문장이 외부 서버로 전송되지 않음
- ✨ **3가지 스타일 동시 출력** — 자연어 · SNS · Formal
- 🌐 **다국어** — 한↔영↔일↔중
- 📋 **CPP 지원** — 필수 태그·문구 자동 삽입 (광고/협찬 표기용)
- 🔔 **자동 업데이트 알림** — 새 버전 출시 시 시작할 때 배너 표시
- 🖥️ **가벼운 네이티브 앱** — Tauri 2 (Rust + Web). Electron보다 훨씬 작음

## 동작 환경

- **OS**: Windows 10/11, macOS, Linux
- **GPU**: VRAM 8GB+ 권장 (CPU만으로도 동작은 하지만 느림)
- **RAM**: 16GB 이상 권장 (14B급 모델 기준. 더 작은 모델은 8GB로도 가능)
- **디스크**: 모델 하나당 5~10GB

---

## 시작하기

### 방법 A — 설치파일로 (Windows, 가장 간편)

[Releases 페이지](https://github.com/hhae0257-eng/local-translator/releases)에서 최신 `.exe` (NSIS) 또는 `.msi` 파일을 받아서 설치하세요.

그 다음 아래 Ollama 설정(1~3단계)을 진행합니다.

### 방법 B — 소스에서 직접 실행

```powershell
git clone https://github.com/hhae0257-eng/local-translator
cd local-translator
npm install
npx tauri dev
```

> 첫 빌드는 Rust 컴파일 때문에 5~10분 걸립니다. 두 번째부터는 금방 뜹니다.

---

## Ollama 설정

### 1단계 — Ollama 설치

[ollama.com](https://ollama.com/)에서 인스톨러를 받아 설치하세요. 무료입니다.  
설치하면 Ollama가 백그라운드 서비스로 자동 실행됩니다.

### 2단계 — 번역용 모델 받기

터미널(PowerShell 또는 cmd)에서 아래 중 하나 실행:

```powershell
ollama pull qwen2.5:14b        # 추천 — 한/영/일/중 모두 우수, 약 9GB
ollama pull qwen3:14b          # 최신 버전, 약 10GB
ollama pull gemma3:12b         # 가벼운 옵션, 약 7GB
ollama pull exaone3.5:7.8b     # 한국어 자연스러움 최강, 약 5GB
```

> 다운로드는 모델 크기에 따라 10분~1시간 정도 걸릴 수 있습니다.

VRAM에 맞는 모델이면 무엇이든 쓸 수 있습니다. 작은 모델(7B)은 빠르고, 큰 모델(14B+)은 번역 품질이 높습니다.

### 3단계 — 앱 연결 허용 (Windows만 해당)

Ollama는 기본적으로 데스크톱 앱의 요청을 차단합니다. 아래 명령을 PowerShell에서 **한 번만** 실행하세요:

```powershell
[System.Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "*", "User")
```

그 다음 **Ollama를 재시작**해야 합니다 (트레이 아이콘 우클릭 → 종료 → 다시 실행).

> macOS / Linux는 대부분 이 설정 없이도 바로 연결됩니다.

### 4단계 — 앱 실행

앱을 열면 자동으로 Ollama에 연결을 시도합니다.  
상단 드롭다운에서 모델 선택 → 왼쪽에 번역할 텍스트 입력 → **Ctrl+Enter**.

오른쪽에 자연어 / SNS / Formal 세 가지 결과가 차례로 나타납니다.

---

## CPP (Content Creator Program) 기능

입력 영역 하단의 **📋 CPP 설정** 패널을 클릭하면:

- **필수 태그** — 번역 결과 앞/뒤에 자동으로 붙는 해시태그 (예: `#광고 #협찬 #ad`)
- **필수 문구** — AI가 번역 내용에 자연스럽게 녹여넣는 공시 문구 (예: `본 포스팅은 유료 광고입니다.`)
- **태그 위치** — 번역 결과 앞에 붙일지, 뒤에 붙일지 선택

---

## 설치파일 직접 만들기

```powershell
npx tauri build
```

`src-tauri/target/release/bundle/` 안에 인스톨러가 생성됩니다.

## 동작 원리

```
┌──────────────────┐  HTTP 요청 3개 (순차)  ┌──────────────┐
│  Tauri Webview   │  ─────────────────►   │    Ollama    │
│  (HTML + JS UI)  │  스타일마다 다른         │  :11434/v1  │
│                  │  시스템 프롬프트          │              │
│                  │  (자연어/SNS/Formal)    │  Qwen 등     │
└──────────────────┘                        └──────────────┘
```

- `src/prompts.js` — 3가지 system prompt + CPP 문구 삽입
- `src/lmstudio.js` — Ollama OpenAI 호환 API 클라이언트
- `src/main.js` — UI 로직, 순차 번역, 버전 표시 및 업데이트 체크
- `src-tauri/` — Rust 백엔드 (창 관리, http 플러그인)

## 자주 발생하는 문제

| 증상 | 해결 |
|---|---|
| 우측 상단에 **연결 실패** | Ollama가 실행 중이 아닙니다. 시작 메뉴에서 Ollama를 실행하거나 `ollama serve` 입력. |
| **403** 오류 | `OLLAMA_ORIGINS` 환경변수가 설정되지 않은 것. 3단계 PowerShell 명령 실행 후 Ollama 재시작. |
| 모델 드롭다운이 비어있음 | Ollama는 켜져 있는데 설치된 모델이 없습니다. `ollama pull <모델명>` 후 ⟳ 클릭. |
| 번역 결과가 비어있음 | Qwen3 thinking 모드가 reasoning에 토큰을 다 쓴 것. 앱이 자동으로 `/no_think`를 전송하므로, 지속되면 Ollama를 재시작해보세요. |
| 빌드 중 `STATUS_ACCESS_VIOLATION` | rustc 간헐 버그. 저장소에 포함된 `src-tauri/.cargo/config.toml`의 `jobs = 1` 설정이 이를 방지합니다. 삭제했다면 복구하세요. |
| `npx tauri dev` 실행 시 `not found: cargo` | Rust 설치 후 터미널을 재시작하지 않은 것. 새 PowerShell 창에서 다시 시도. |

## 라이센스

MIT — [LICENSE](./LICENSE) 참고

## 사용한 도구 / 감사

- [Tauri](https://tauri.app/) — 데스크톱 셸
- [Ollama](https://ollama.com/) — 로컬 LLM 실행 환경
- [Qwen](https://qwenlm.github.io/), [Gemma](https://ai.google.dev/gemma), [EXAONE](https://www.lgresearch.ai/) — 오픈 모델

# Daily Calendar — 코드 구조 해설

> 이 문서는 Daily Calendar 옵시디언 플러그인의 전체 구조를 설명한다.
> TypeScript와 옵시디언 플러그인 개발을 처음 접하는 사람을 기준으로 작성되었다.

---

## 전체 구조

```
Obsidian_Daily_Calendar/
├── manifest.json          ← 플러그인 메타데이터 (옵시디언이 읽음)
├── package.json           ← npm 의존성 + 빌드 스크립트
├── tsconfig.json          ← TypeScript 컴파일러 설정
├── esbuild.config.mjs     ← 빌드 도구 설정
├── styles.css             ← 캘린더 스타일 (CSS)
├── main.js                ← 빌드 결과물 (이것만 옵시디언에 배포)
└── src/
    ├── main.ts            ← 진입점: 플러그인 등록, 설정 로드
    ├── calendarView.ts    ← UI: 사이드바 캘린더 렌더링
    ├── dailyNote.ts       ← 핵심 로직: 노트 생성/열기/경로 계산
    └── settings.ts        ← 설정: UI + 데이터 구조
```

---

## 파일별 역할

### manifest.json
옵시디언이 플러그인을 인식하기 위한 메타데이터.
- `id`: 플러그인 고유 ID. community-plugins.json에서 이 값으로 활성화됨
- `minAppVersion`: 지원하는 최소 옵시디언 버전

### package.json
npm 패키지 관리.
- `devDependencies`: 개발 시에만 필요한 도구 (TypeScript, esbuild, obsidian 타입)
- `obsidian`은 devDependencies에 있음 — 런타임에는 옵시디언 앱이 직접 제공하므로 번들에 포함시키지 않음
- 빌드 명령: `npm run build` (프로덕션), `npm run dev` (개발 + 감시 모드)

### esbuild.config.mjs
esbuild 번들러 설정.
- `entryPoints`: 시작 파일 (src/main.ts)
- `external: ["obsidian"]`: obsidian 모듈은 번들에 포함하지 않음 (런타임 제공)
- `format: "cjs"`: CommonJS 형식 (옵시디언이 요구)
- `outfile: "main.js"`: 결과물 파일명

### tsconfig.json
TypeScript 컴파일러 설정.
- `module: "ESNext"`: 최신 ES 모듈 문법 사용
- `target: "ES6"`: ES6 수준으로 컴파일
- `strictNullChecks: true`: null 안전성 검사

---

## 핵심 흐름

### 1. 플러그인 로드 시 (main.ts)

```
옵시디언 시작
  → DailyCalendarPlugin.onload() 호출
  → 설정 로드 (data.json)
  → 캘린더 뷰 타입 등록 (registerView)
  → 리본 아이콘 추가 (addRibbonIcon)
  → 설정 탭 등록 (addSettingTab)
```

### 2. 캘린더 표시 (calendarView.ts)

```
리본 아이콘 클릭
  → activateView(): 오른쪽 사이드바에 leaf 생성
  → CalendarView.onOpen(): 캘린더 렌더링
  → renderHeader(): 월 네비게이션 (<, 제목, >)
  → renderDayGrid(): 날짜 테이블 생성
    → 각 셀에 클릭 이벤트 연결
    → hasDailyNote()로 dot 표시 여부 결정
```

### 3. 날짜 클릭 시 (dailyNote.ts)

```
날짜 셀 클릭
  → createOrOpenDailyNote(app, date, settings) 호출
  → getDailyNotePath(): 경로 계산
    예: "1_Daily/2026-02/2026-02-11.md"
  → 파일 존재? → openFile()
  → 파일 없음?
    → 폴더 확인/생성 (createFolder)
    → applyTemplate(): 템플릿 읽기 + {{date:FORMAT}} 치환
    → vault.create(): 파일 생성
    → openFile(): 에디터에서 열기
  → renderCalendar(): dot 갱신
```

### 4. Vault 이벤트 감지

```
파일 생성/삭제/이름변경 발생
  → vault.on("create"/"delete"/"rename") 이벤트
  → renderCalendar() 호출 → dot 자동 갱신
```

---

## 사용된 Obsidian API

| API | 위치 | 역할 |
|-----|------|------|
| `Plugin` | main.ts | 플러그인 기본 클래스 |
| `ItemView` | calendarView.ts | 사이드바 뷰 기본 클래스 |
| `vault.create(path, content)` | dailyNote.ts | 파일 생성 |
| `vault.createFolder(path)` | dailyNote.ts | 폴더 생성 |
| `vault.getAbstractFileByPath(path)` | dailyNote.ts | 파일/폴더 존재 확인 |
| `vault.cachedRead(file)` | dailyNote.ts | 파일 내용 읽기 |
| `vault.on("create"/"delete"/"rename")` | calendarView.ts | 파일 변경 감지 |
| `workspace.getLeaf(false)` | dailyNote.ts | 에디터 탭 가져오기 |
| `workspace.getRightLeaf(false)` | main.ts | 오른쪽 사이드바 leaf |
| `leaf.openFile(file)` | dailyNote.ts | 파일 열기 |
| `registerView(type, factory)` | main.ts | 뷰 타입 등록 |
| `addRibbonIcon(icon, title, cb)` | main.ts | 사이드바 아이콘 추가 |
| `addSettingTab(tab)` | main.ts | 설정 탭 등록 |
| `PluginSettingTab` | settings.ts | 설정 UI 기본 클래스 |
| `Setting` | settings.ts | 설정 항목 UI 컴포넌트 |
| `moment` | calendarView.ts, dailyNote.ts | 날짜 처리 (옵시디언 전역 제공) |

---

## 주요 패턴

### 1. Obsidian 플러그인 생명주기
- `onload()`: 플러그인이 켜질 때. 뷰 등록, 이벤트 바인딩, UI 추가.
- `onunload()`: 플러그인이 꺼질 때. 뷰 정리, 이벤트 해제.
- `registerEvent()`: 이벤트 리스너를 등록하면 unload 시 자동 해제.

### 2. 설정 저장/로드
- `loadData()` → `data.json`에서 읽기. 없으면 null 반환.
- `saveData(obj)` → `data.json`에 쓰기.
- `Object.assign({}, DEFAULT, loaded)` — 기본값과 병합. 새 필드가 추가돼도 안전.

### 3. 템플릿 치환
- 정규식 `/\{\{date:(.*?)\}\}/g`로 `{{date:FORMAT}}` 패턴 매칭
- 캡처 그룹 `(.*?)`이 FORMAT 부분을 추출
- `moment.format(FORMAT)`으로 실제 날짜 문자열 생성
- `locale("en")`으로 영어 요일명 강제 (시스템 로케일 무시)

### 4. Templater 연동
- 우리 플러그인이 `vault.create()`로 파일 생성
- Obsidian이 "file create" 이벤트 발생
- Templater의 `trigger_on_file_creation`이 감지
- 파일 내용에 `<% %>` 문법이 있으면 Templater가 자동 처리
- 따라서 템플릿에 `{{date:}}` (우리가 처리) + `<% tp.file.cursor() %>` (Templater가 처리) 공존 가능

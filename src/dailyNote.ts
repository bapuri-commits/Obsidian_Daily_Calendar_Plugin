/**
 * dailyNote.ts — 데일리 노트 생성/열기 로직
 *
 * 이 파일이 플러그인의 핵심 기능을 담당한다:
 * 1. 날짜에 해당하는 데일리 노트 경로를 계산
 * 2. 폴더가 없으면 생성
 * 3. 파일이 없으면 템플릿을 읽어 변수를 치환하고 생성
 * 4. 파일이 있으면 바로 열기
 *
 * 핵심 Obsidian API:
 * - vault.getAbstractFileByPath(path): 파일/폴더 존재 여부 확인
 * - vault.createFolder(path): 폴더 생성
 * - vault.create(path, content): 파일 생성
 * - vault.cachedRead(file): 파일 내용 읽기 (캐시 사용, 표시용)
 * - workspace.getLeaf(): 에디터 탭(leaf) 가져오기
 * - leaf.openFile(file): 파일 열기
 */
import { App, TFile, moment } from "obsidian";
import type { DailyCalendarSettings } from "./settings";

/**
 * 데일리 노트의 경로 구성 요소를 계산한다.
 *
 * 예시 (2026-02-11, 기본 설정):
 * - folderPath: "1_Daily/2026-02"
 * - fileName:   "2026-02-11.md"
 * - fullPath:   "1_Daily/2026-02/2026-02-11.md"
 */
function getDailyNotePath(date: moment.Moment, settings: DailyCalendarSettings) {
  const subFolder = date.format(settings.subFolderFormat);
  const fileName = date.format(settings.fileNameFormat) + ".md";

  return {
    folderPath: `${settings.baseFolder}/${subFolder}`,
    fileName: fileName,
    fullPath: `${settings.baseFolder}/${subFolder}/${fileName}`,
  };
}

/**
 * 템플릿 파일을 읽고 {{date:FORMAT}} 변수를 치환한다.
 *
 * 동작 원리:
 * 1. 설정에서 지정한 템플릿 파일을 vault에서 읽는다
 * 2. 정규식으로 {{date:FORMAT}} 패턴을 찾는다
 * 3. FORMAT 부분을 moment의 format()에 전달해서 실제 날짜 문자열로 치환
 *
 * 예시:
 *   "{{date:YYYY-MM-DD}}" → "2026-02-11"
 *   "{{date:ddd}}"        → "Wed"
 *   "{{date:YYYY-MM}}"    → "2026-02"
 *
 * 정규식 설명: /\{\{date:(.*?)\}\}/g
 *   \{\{     — 리터럴 {{
 *   date:    — 리터럴 "date:"
 *   (.*?)    — FORMAT 부분을 캡처 (비탐욕적 매칭)
 *   \}\}     — 리터럴 }}
 *   g        — 전역 매칭 (모든 {{date:...}}를 치환)
 */
async function applyTemplate(
  app: App,
  date: moment.Moment,
  settings: DailyCalendarSettings
): Promise<string> {
  // 설정의 templatePath에 .md 확장자 붙이기
  const templatePath = settings.templatePath + ".md";

  // 템플릿 파일 가져오기
  const templateFile = app.vault.getAbstractFileByPath(templatePath);

  if (!templateFile || !(templateFile instanceof TFile)) {
    // 템플릿 파일이 없으면 기본 내용으로 생성
    console.warn(`템플릿 파일을 찾을 수 없음: ${templatePath}`);
    return `# ${date.clone().locale("en").format("YYYY-MM-DD (ddd)")}\n\n`;
  }

  // 템플릿 내용 읽기
  const templateContent = await app.vault.cachedRead(templateFile);

  // {{date:FORMAT}} 패턴을 모두 찾아서 실제 날짜로 치환
  // locale("en")으로 영어 요일명 강제 — 시스템 로케일(한국어)에 의존하지 않음
  const result = templateContent.replace(
    /\{\{date:(.*?)\}\}/g,
    (_match: string, format: string) => {
      return date.clone().locale("en").format(format);
    }
  );

  return result;
}

/**
 * 데일리 노트를 생성하거나 열다.
 *
 * 전체 흐름:
 * 1. 날짜로부터 파일 경로 계산
 * 2. 이미 존재하면 → 해당 파일 열기
 * 3. 존재하지 않으면:
 *    a. 폴더 확인/생성
 *    b. 템플릿 읽기 + 변수 치환
 *    c. 파일 생성
 *    d. 생성된 파일 열기
 */
export async function createOrOpenDailyNote(
  app: App,
  date: moment.Moment,
  settings: DailyCalendarSettings
): Promise<void> {
  const { folderPath, fullPath } = getDailyNotePath(date, settings);

  // 1. 이미 존재하는지 확인
  const existingFile = app.vault.getAbstractFileByPath(fullPath);

  if (existingFile && existingFile instanceof TFile) {
    // 이미 있으면 열기만
    const leaf = app.workspace.getLeaf(false);
    await leaf.openFile(existingFile);
    return;
  }

  // 2. 폴더 확인 — 없으면 생성
  //    "1_Daily/2026-02" 폴더가 없을 수 있음 (새 달의 첫 노트)
  const folder = app.vault.getAbstractFileByPath(folderPath);
  if (!folder) {
    await app.vault.createFolder(folderPath);
  }

  // 3. 템플릿 적용 + 파일 생성
  const content = await applyTemplate(app, date, settings);
  const newFile = await app.vault.create(fullPath, content);

  // 4. 생성된 파일 열기
  const leaf = app.workspace.getLeaf(false);
  await leaf.openFile(newFile);
}

/**
 * 특정 날짜에 데일리 노트가 존재하는지 확인한다.
 * 캘린더의 dot 표시에서 사용.
 */
export function hasDailyNote(
  app: App,
  date: moment.Moment,
  settings: DailyCalendarSettings
): boolean {
  const { fullPath } = getDailyNotePath(date, settings);
  const file = app.vault.getAbstractFileByPath(fullPath);
  return file instanceof TFile;
}

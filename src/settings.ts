/**
 * settings.ts — 플러그인 설정 관리
 *
 * 옵시디언 플러그인의 설정 시스템:
 * 1. 인터페이스로 설정 구조를 정의
 * 2. 기본값을 상수로 지정
 * 3. PluginSettingTab을 상속해서 설정 UI를 구성
 * 4. plugin.loadData() / plugin.saveData()로 디스크에 저장/로드
 *
 * 설정은 .obsidian/plugins/daily-calendar/data.json에 자동 저장된다.
 */
import { App, PluginSettingTab, Setting } from "obsidian";
import type DailyCalendarPlugin from "./main";

/**
 * 플러그인 설정 구조.
 * 사용자가 커스텀할 수 있는 값들을 정의한다.
 */
export interface DailyCalendarSettings {
  /** 데일리 노트의 루트 폴더 (예: "1_Daily") */
  baseFolder: string;

  /** 월별 서브폴더 형식 (moment format, 예: "YYYY-MM") */
  subFolderFormat: string;

  /** 파일명 형식 (moment format, 예: "YYYY-MM-DD") */
  fileNameFormat: string;

  /** 템플릿 파일 경로 (예: "Templates/daily") — 확장자 없이 */
  templatePath: string;
}

/** 기본 설정값 */
export const DEFAULT_SETTINGS: DailyCalendarSettings = {
  baseFolder: "1_Daily",
  subFolderFormat: "YYYY-MM",
  fileNameFormat: "YYYY-MM-DD",
  templatePath: "Templates/daily",
};

/**
 * 설정 탭 UI.
 *
 * 옵시디언의 Setting 클래스를 사용해서 설정 항목을 하나씩 추가한다.
 * Setting 클래스는 "이름 + 설명 + 입력 컴포넌트" 형태의 행을 만든다.
 *
 * 설정 변경 → saveSettings() 호출 → data.json에 저장
 */
export class DailyCalendarSettingTab extends PluginSettingTab {
  plugin: DailyCalendarPlugin;

  constructor(app: App, plugin: DailyCalendarPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // 설정 페이지 제목
    containerEl.createEl("h2", { text: "Daily Calendar 설정" });

    // 1. 루트 폴더
    new Setting(containerEl)
      .setName("데일리 노트 폴더")
      .setDesc("데일리 노트가 저장될 루트 폴더")
      .addText((text) =>
        text
          .setPlaceholder("1_Daily")
          .setValue(this.plugin.settings.baseFolder)
          .onChange(async (value) => {
            this.plugin.settings.baseFolder = value;
            await this.plugin.saveSettings();
          })
      );

    // 2. 서브폴더 형식
    new Setting(containerEl)
      .setName("월별 폴더 형식")
      .setDesc("월별 서브폴더 이름 형식 (moment format). 예: YYYY-MM → 2026-02")
      .addText((text) =>
        text
          .setPlaceholder("YYYY-MM")
          .setValue(this.plugin.settings.subFolderFormat)
          .onChange(async (value) => {
            this.plugin.settings.subFolderFormat = value;
            await this.plugin.saveSettings();
          })
      );

    // 3. 파일명 형식
    new Setting(containerEl)
      .setName("파일명 형식")
      .setDesc("데일리 노트 파일명 형식 (moment format). 예: YYYY-MM-DD → 2026-02-11")
      .addText((text) =>
        text
          .setPlaceholder("YYYY-MM-DD")
          .setValue(this.plugin.settings.fileNameFormat)
          .onChange(async (value) => {
            this.plugin.settings.fileNameFormat = value;
            await this.plugin.saveSettings();
          })
      );

    // 4. 템플릿 경로
    new Setting(containerEl)
      .setName("템플릿 파일")
      .setDesc("데일리 노트에 적용할 템플릿 파일 경로 (확장자 .md 제외)")
      .addText((text) =>
        text
          .setPlaceholder("Templates/daily")
          .setValue(this.plugin.settings.templatePath)
          .onChange(async (value) => {
            this.plugin.settings.templatePath = value;
            await this.plugin.saveSettings();
          })
      );
  }
}

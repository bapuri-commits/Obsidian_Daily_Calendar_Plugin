/**
 * Daily Calendar 플러그인 — 메인 엔트리포인트
 *
 * 옵시디언 플러그인의 시작점. Plugin 클래스를 상속받아
 * onload()(플러그인 활성화 시)와 onunload()(비활성화 시)를 구현한다.
 *
 * 이 파일의 역할:
 * - 사이드바에 캘린더 뷰를 등록
 * - 리본(왼쪽 사이드바 아이콘)에 캘린더 버튼 추가
 * - 플러그인 설정 로드/저장
 */
import { Plugin, WorkspaceLeaf } from "obsidian";
import { CalendarView, VIEW_TYPE_CALENDAR } from "./calendarView";
import {
  DailyCalendarSettings,
  DEFAULT_SETTINGS,
  DailyCalendarSettingTab,
} from "./settings";

export default class DailyCalendarPlugin extends Plugin {
  /** 플러그인 설정 — loadSettings()로 로드, saveSettings()로 저장 */
  settings: DailyCalendarSettings = DEFAULT_SETTINGS;

  /**
   * 플러그인이 활성화될 때 호출된다.
   * 여기서 뷰 등록, 아이콘 추가, 이벤트 리스너 등을 세팅한다.
   */
  async onload() {
    console.log("Daily Calendar 플러그인 로드됨");

    // 0. 설정 로드 (data.json에서 읽기)
    await this.loadSettings();

    // 1. 사이드바 뷰 타입 등록
    //    VIEW_TYPE_CALENDAR이라는 고유 ID로 CalendarView를 등록한다.
    //    옵시디언은 이 ID로 뷰를 식별하고 관리한다.
    this.registerView(
      VIEW_TYPE_CALENDAR,
      (leaf: WorkspaceLeaf) => new CalendarView(leaf, this)
    );

    // 2. 리본 아이콘 추가 (왼쪽 사이드바의 아이콘 버튼)
    //    클릭하면 캘린더 사이드바를 연다.
    this.addRibbonIcon("calendar", "Daily Calendar", () => {
      this.activateView();
    });

    // 3. 설정 탭 등록
    //    옵시디언 설정 > 커뮤니티 플러그인 > Daily Calendar 에 톱니바퀴가 생긴다.
    this.addSettingTab(new DailyCalendarSettingTab(this.app, this));
  }

  /**
   * 플러그인이 비활성화될 때 호출된다.
   * 등록한 뷰를 정리(detach)한다.
   */
  onunload() {
    console.log("Daily Calendar 플러그인 언로드됨");
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_CALENDAR);
  }

  /**
   * 설정을 data.json에서 로드한다.
   * Object.assign으로 기본값과 병합하여, 새 설정 필드가 추가돼도
   * 기존 data.json에 없는 필드는 기본값으로 채워진다.
   */
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  /** 현재 설정을 data.json에 저장한다. */
  async saveSettings() {
    await this.saveData(this.settings);
  }

  /**
   * 캘린더 사이드바를 연다.
   * 이미 열려있으면 포커스만 이동, 없으면 새로 생성한다.
   */
  async activateView() {
    const { workspace } = this.app;

    // 이미 열린 캘린더 뷰가 있는지 확인
    let leaf = workspace.getLeavesOfType(VIEW_TYPE_CALENDAR)[0];

    if (!leaf) {
      // 없으면 오른쪽 사이드바에 새 leaf를 만들어 뷰를 배치
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        await rightLeaf.setViewState({
          type: VIEW_TYPE_CALENDAR,
          active: true,
        });
        leaf = rightLeaf;
      }
    }

    // 해당 뷰로 포커스 이동
    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }
}

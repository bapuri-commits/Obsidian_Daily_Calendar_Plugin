/**
 * CalendarView — 사이드바 캘린더 뷰
 *
 * 옵시디언의 ItemView를 상속받아 사이드바에 달력을 표시한다.
 * 외부 라이브러리 없이 순수 HTML 테이블로 캘린더를 렌더링한다.
 *
 * 주요 개념:
 * - ItemView: 옵시디언의 사이드바/탭에 표시되는 뷰의 기본 클래스
 * - containerEl: 옵시디언이 뷰에 제공하는 루트 HTML 요소
 * - moment: 옵시디언이 전역으로 제공하는 날짜 라이브러리 (import 불필요)
 *
 * 캘린더 구조:
 * ┌─────────────────────┐
 * │  <  2026년 02월  >   │  ← 헤더 (월 네비게이션)
 * ├─────────────────────┤
 * │ 월 화 수 목 금 토 일 │  ← 요일 헤더
 * ├─────────────────────┤
 * │           1  2  3  4 │  ← 날짜 셀 (클릭 가능)
 * │  5  6  7  8  9 10 11 │
 * │ ...                  │
 * └─────────────────────┘
 */
import { ItemView, WorkspaceLeaf, moment } from "obsidian";
import type DailyCalendarPlugin from "./main";
import { createOrOpenDailyNote, hasDailyNote } from "./dailyNote";

/** 뷰 타입 ID — 플러그인 전체에서 이 문자열로 뷰를 식별한다 */
export const VIEW_TYPE_CALENDAR = "daily-calendar-view";

export class CalendarView extends ItemView {
  plugin: DailyCalendarPlugin;

  /** 현재 표시 중인 월 (moment 객체). 네비게이션으로 변경됨 */
  private displayedMonth: moment.Moment;

  constructor(leaf: WorkspaceLeaf, plugin: DailyCalendarPlugin) {
    super(leaf);
    this.plugin = plugin;
    // 처음에는 오늘이 속한 달을 표시
    this.displayedMonth = moment().startOf("month");
  }

  getViewType(): string {
    return VIEW_TYPE_CALENDAR;
  }

  getDisplayText(): string {
    return "Daily Calendar";
  }

  getIcon(): string {
    return "calendar";
  }

  /**
   * 뷰가 열릴 때 호출된다.
   * 캘린더를 렌더링하고, vault 파일 변경을 감지해서 dot을 자동 갱신한다.
   */
  async onOpen() {
    this.renderCalendar();

    // vault에서 파일이 생성/삭제/이름변경될 때 캘린더를 다시 그린다.
    // this.registerEvent()를 사용하면 뷰가 닫힐 때 자동으로 이벤트 해제됨.
    this.registerEvent(
      this.app.vault.on("create", () => this.renderCalendar())
    );
    this.registerEvent(
      this.app.vault.on("delete", () => this.renderCalendar())
    );
    this.registerEvent(
      this.app.vault.on("rename", () => this.renderCalendar())
    );
  }

  async onClose() {
    this.containerEl.empty();
  }

  // ──────────────────────────────────────────
  // 렌더링 메서드
  // ──────────────────────────────────────────

  /**
   * 캘린더 전체를 다시 그린다.
   * 월 이동 시에도 이 메서드를 호출해서 전체를 새로 렌더링한다.
   */
  private renderCalendar() {
    // containerEl.children[1]이 콘텐츠 영역 (children[0]은 뷰 헤더)
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();

    const wrapper = container.createEl("div", { cls: "daily-calendar" });

    this.renderHeader(wrapper);
    this.renderDayGrid(wrapper);
  }

  /**
   * 헤더를 렌더링한다: [<] 2026년 02월 [>]
   * 화살표 버튼으로 이전/다음 달로 이동 가능.
   */
  private renderHeader(wrapper: HTMLElement) {
    const header = wrapper.createEl("div", { cls: "daily-calendar-header" });

    // 이전 달 버튼
    const prevBtn = header.createEl("button", { text: "<", cls: "daily-calendar-nav" });
    prevBtn.addEventListener("click", () => {
      this.displayedMonth = this.displayedMonth.clone().subtract(1, "month");
      this.renderCalendar();
    });

    // 현재 월 표시 (예: "2026년 02월")
    header.createEl("span", {
      text: this.displayedMonth.format("YYYY년 MM월"),
      cls: "daily-calendar-title",
    });

    // 다음 달 버튼
    const nextBtn = header.createEl("button", { text: ">", cls: "daily-calendar-nav" });
    nextBtn.addEventListener("click", () => {
      this.displayedMonth = this.displayedMonth.clone().add(1, "month");
      this.renderCalendar();
    });
  }

  /**
   * 날짜 그리드를 렌더링한다.
   *
   * 달력 그리드 생성 알고리즘:
   * 1. 해당 월의 1일이 무슨 요일인지 확인 (0=월 ~ 6=일)
   * 2. 1일 앞의 빈 칸을 채움
   * 3. 1일부터 마지막 날까지 셀을 생성
   * 4. 각 셀에 클릭 이벤트를 연결
   */
  private renderDayGrid(wrapper: HTMLElement) {
    const table = wrapper.createEl("table", { cls: "daily-calendar-grid" });

    // 요일 헤더 행
    const headRow = table.createEl("tr");
    const dayNames = ["월", "화", "수", "목", "금", "토", "일"];
    for (const name of dayNames) {
      headRow.createEl("th", { text: name });
    }

    // 이번 달의 1일과 마지막 날
    const firstDay = this.displayedMonth.clone().startOf("month");
    const lastDay = this.displayedMonth.clone().endOf("month");

    // 1일의 요일 (moment의 isoWeekday: 1=월 ~ 7=일, 우리는 0=월 ~ 6=일로 변환)
    const startWeekday = firstDay.isoWeekday() - 1; // 0=월 ~ 6=일

    const today = moment().startOf("day");
    let currentRow = table.createEl("tr");

    // 1일 앞의 빈 칸 채우기
    for (let i = 0; i < startWeekday; i++) {
      currentRow.createEl("td", { cls: "daily-calendar-empty" });
    }

    // 1일부터 마지막 날까지 셀 생성
    let dayOfWeek = startWeekday;
    for (let date = 1; date <= lastDay.date(); date++) {
      // 한 주가 끝나면 새 행 시작
      if (dayOfWeek === 7) {
        currentRow = table.createEl("tr");
        dayOfWeek = 0;
      }

      const cell = currentRow.createEl("td", {
        text: String(date),
        cls: "daily-calendar-day",
      });

      // 오늘 날짜 강조
      const cellDate = this.displayedMonth.clone().date(date);
      if (cellDate.isSame(today, "day")) {
        cell.addClass("daily-calendar-today");
      }

      // 노트가 존재하는 날짜에 점(dot) 표시
      if (hasDailyNote(this.app, cellDate, this.plugin.settings)) {
        cell.addClass("daily-calendar-has-note");
      }

      // 날짜 클릭 → 데일리 노트 생성 또는 열기
      cell.addEventListener("click", async () => {
        const clickedDate = this.displayedMonth.clone().date(date);
        await createOrOpenDailyNote(this.app, clickedDate, this.plugin.settings);
        // 노트 생성 후 캘린더를 다시 그려서 dot 반영
        this.renderCalendar();
      });

      dayOfWeek++;
    }

    // 마지막 행의 남은 빈 칸 채우기
    while (dayOfWeek < 7) {
      currentRow.createEl("td", { cls: "daily-calendar-empty" });
      dayOfWeek++;
    }
  }
}

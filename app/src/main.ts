import "pretendard/dist/web/variable/pretendardvariable.css";
import "./styles.css";

import { CANDIDATES, CANDIDATE_DATASET_METADATA, DEFAULT_SCORING_OPTIONS, DEFAULT_WEIGHTS } from "./data";
import {
  fetchNearbyPlaces,
  loadKakaoPlacesSdk,
  searchKakaoPlaces,
  type LivePlace,
  type LivePlaceSnapshot,
} from "./kakao";
import { DukkeobiMap, type MappableCandidate } from "./map";
import { filterCandidates, scoreCandidates } from "./scoring";
import { readStored, writeStored } from "./storage";
import { WEIGHT_KEYS, type CandidateFilters, type ScoredCandidate, type ScoringOptions, type WeightKey } from "./types";

const COMPACT_LAYOUT_QUERY = "(max-width: 1199px)";
const compactLayout = window.matchMedia(COMPACT_LAYOUT_QUERY);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const SHEET_DRAG_THRESHOLD = 56;
const SHEET_FLICK_VELOCITY = 0.42;

type SheetState = "peek" | "open";

interface InspectorReturnTarget {
  action: string;
  candidateId: string;
  scopeId: string;
  activePanel: string;
  sheetState: SheetState;
}

interface SheetDragState {
  pointerId: number;
  startY: number;
  lastY: number;
  startedAt: number;
  origin: SheetState;
  moved: boolean;
}

const metricCopy: Record<WeightKey, { label: string; description: string }> = {
  transit: { label: "교통", description: "지하철·버스 접근성" },
  daily: { label: "생활", description: "편의·공공시설" },
  health: { label: "건강", description: "병원·약국 수" },
  safety: { label: "안전", description: "안전시설에서 위험요소 감점" },
  budget: { label: "비용", description: "월세 + 보증금의 월 환산비용" },
};

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`필수 화면 요소가 없습니다: ${selector}`);
  return element;
}

function escapeMarkup(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatMoney(value: number): string {
  if (value <= 0) return "0원";
  const eok = Math.floor(value / 10_000);
  const remainder = value % 10_000;
  if (eok > 0 && remainder > 0) return `${eok}억 ${formatNumber(remainder)}만원`;
  if (eok > 0) return `${eok}억원`;
  return `${formatNumber(value)}만원`;
}

function formatContract(candidate: ScoredCandidate): string {
  if (candidate.contractType === "전세") return `전세 ${formatMoney(candidate.deposit)}`;
  return `보증금 ${formatMoney(candidate.deposit)} · 월 ${formatMoney(candidate.monthlyRent)}`;
}

function formatObservedAt(value: string): string {
  const observedAt = new Date(value);
  if (Number.isNaN(observedAt.getTime())) return "관측시각 미상";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(observedAt);
}

function livePlaceMarkup(place: LivePlace): string {
  const address = place.roadAddress || place.address || "주소 정보 없음";
  const distance = place.distanceMeters === null ? "거리 미상" : `${formatNumber(Math.round(place.distanceMeters))}m`;
  const link = place.url
    ? `<a href="${escapeMarkup(place.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeMarkup(place.name)} Kakao 지도에서 보기">Kakao ↗</a>`
    : "";
  return `<li><span><strong>${escapeMarkup(place.name)}</strong><small>${escapeMarkup(`${place.category} · ${address} · ${distance}`)}</small></span>${link}</li>`;
}

function scoreLabel(score: number): string {
  if (score >= 78) return "기준과 잘 맞아요";
  if (score >= 62) return "균형이 좋아요";
  if (score >= 46) return "조건을 더 살펴보세요";
  return "우선순위와 거리가 있어요";
}

function normalizeWeights(value: unknown): Record<WeightKey, number> {
  if (!value || typeof value !== "object") return { ...DEFAULT_WEIGHTS };
  const input = value as Partial<Record<WeightKey, unknown>>;
  const parsed = { ...DEFAULT_WEIGHTS } as Record<WeightKey, number>;
  WEIGHT_KEYS.forEach((key) => {
    const candidate = Number(input[key]);
    if (Number.isFinite(candidate) && candidate >= 0 && candidate <= 50) parsed[key] = candidate;
  });
  if (Object.values(parsed).every((weight) => weight === 0)) return { ...DEFAULT_WEIGHTS };
  return parsed;
}

const elements = {
  controlPanel: requiredElement<HTMLElement>(".control-panel"),
  sheetToggle: requiredElement<HTMLButtonElement>("#sheet-toggle"),
  panelHeading: requiredElement<HTMLElement>(".panel-heading"),
  panelTabs: requiredElement<HTMLElement>(".panel-tabs"),
  panelScroll: requiredElement<HTMLElement>("#panel-scroll"),
  dataStatus: requiredElement<HTMLElement>("#data-status"),
  providerStatus: requiredElement<HTMLElement>("#provider-status"),
  mobileDataStatus: requiredElement<HTMLElement>("#mobile-data-status"),
  mobileProviderStatus: requiredElement<HTMLElement>("#mobile-provider-status"),
  searchForm: requiredElement<HTMLFormElement>("#search-form"),
  placeSearch: requiredElement<HTMLInputElement>("#place-search"),
  candidateSearch: requiredElement<HTMLInputElement>("#candidate-search"),
  districtFilter: requiredElement<HTMLSelectElement>("#district-filter"),
  leaseFilter: requiredElement<HTMLSelectElement>("#lease-filter"),
  depositLimit: requiredElement<HTMLInputElement>("#deposit-limit"),
  depositOutput: requiredElement<HTMLOutputElement>("#deposit-limit-output"),
  rentLimit: requiredElement<HTMLInputElement>("#rent-limit"),
  rentOutput: requiredElement<HTMLOutputElement>("#rent-limit-output"),
  depositRate: requiredElement<HTMLInputElement>("#deposit-rate"),
  depositRateOutput: requiredElement<HTMLOutputElement>("#deposit-rate-output"),
  candidateCount: requiredElement<HTMLElement>("#candidate-count"),
  candidateList: requiredElement<HTMLOListElement>("#candidate-list"),
  activeFilters: requiredElement<HTMLElement>("#active-filters"),
  analysisSummary: requiredElement<HTMLElement>("#analysis-summary"),
  topCandidates: requiredElement<HTMLOListElement>("#top-candidates"),
  savedList: requiredElement<HTMLUListElement>("#saved-list"),
  compareTray: requiredElement<HTMLElement>("#compare-tray"),
  compareList: requiredElement<HTMLUListElement>("#compare-list"),
  openComparison: requiredElement<HTMLButtonElement>("#open-comparison"),
  comparisonDialog: requiredElement<HTMLDialogElement>("#comparison-dialog"),
  comparisonContent: requiredElement<HTMLElement>("#comparison-content"),
  closeComparison: requiredElement<HTMLButtonElement>("#close-comparison"),
  methodDialog: requiredElement<HTMLDialogElement>("#method-dialog"),
  openMethod: requiredElement<HTMLButtonElement>("#open-method"),
  openMethodMobile: requiredElement<HTMLButtonElement>("#open-method-mobile"),
  closeMethod: requiredElement<HTMLButtonElement>("#close-method"),
  inspector: requiredElement<HTMLElement>("#inspector"),
  inspectorEmpty: requiredElement<HTMLElement>("#inspector-empty"),
  inspectorContent: requiredElement<HTMLElement>("#inspector-content"),
  closeInspector: requiredElement<HTMLButtonElement>("#close-inspector"),
  favoriteButton: requiredElement<HTMLButtonElement>("#favorite-button"),
  inspectorName: requiredElement<HTMLElement>("[data-inspector-name]"),
  inspectorAddress: requiredElement<HTMLElement>("[data-inspector-address]"),
  scoreLabel: requiredElement<HTMLElement>("[data-score-label]"),
  scoreValue: requiredElement<HTMLElement>("#score-value"),
  scoreRing: requiredElement<HTMLElement>("#score-ring"),
  metricList: requiredElement<HTMLElement>("#metric-list"),
  evidenceList: requiredElement<HTMLUListElement>("#evidence-list"),
  livePlacesSection: requiredElement<HTMLElement>("#live-places-section"),
  liveObservedAt: requiredElement<HTMLTimeElement>("#live-observed-at"),
  livePlaceList: requiredElement<HTMLUListElement>("#live-place-list"),
  livePoiButton: requiredElement<HTMLButtonElement>("#live-poi-button"),
  livePoiLabel: requiredElement<HTMLElement>("#live-poi-label"),
  locateButton: requiredElement<HTMLButtonElement>("#locate-button"),
  resetWeights: requiredElement<HTMLButtonElement>("#reset-weights"),
  map: requiredElement<HTMLElement>("#map"),
  toast: requiredElement<HTMLElement>("#toast"),
};

const config = window.DUKKEOBI_CONFIG ?? {
  kakaoJsKey: "",
  build: "development",
  dataMode: "snapshot" as const,
};
const kakaoKey = config.kakaoJsKey.trim();

let weights = normalizeWeights(readStored<unknown>("weights", DEFAULT_WEIGHTS));
function normalizeDepositRate(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 12
    ? parsed
    : DEFAULT_SCORING_OPTIONS.depositAnnualRatePercent;
}
let scoringOptions: ScoringOptions = {
  depositAnnualRatePercent: normalizeDepositRate(
    readStored<unknown>("depositAnnualRatePercent", DEFAULT_SCORING_OPTIONS.depositAnnualRatePercent),
  ),
};
let scoredCandidates: ScoredCandidate[] = [];
let visibleCandidates: ScoredCandidate[] = [];
let selectedId: string | null = null;

function storedCandidateIds(key: string, limit = Number.POSITIVE_INFINITY): string[] {
  const stored = readStored<unknown>(key, []);
  if (!Array.isArray(stored)) return [];
  return stored
    .filter((id): id is string => typeof id === "string" && CANDIDATES.some((item) => item.id === id))
    .slice(0, limit);
}

let favoriteIds = new Set(storedCandidateIds("favorites"));
let comparisonIds = new Set(storedCandidateIds("comparison", 3));
const liveSnapshots = new Map<string, LivePlaceSnapshot>();
let previousRanks = new Map<string, number>();
let rankDeltas = new Map<string, number>();
let toastTimer = 0;
let liveRequestGeneration = 0;
let placeSearchGeneration = 0;
let inspectorReturnTarget: InspectorReturnTarget | null = null;
let sheetState: SheetState = "peek";
let sheetDrag: SheetDragState | null = null;
let suppressSheetClick = false;
let flipFrame = 0;
const flipAnimations = new Map<string, Animation>();

const map = new DukkeobiMap(elements.map, (id, focusInspector = false) => {
  inspectorReturnTarget = null;
  selectCandidate(id, true, focusInspector);
}, previewCandidateInLists);

function showToast(message: string, tone: "default" | "error" = "default"): void {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.dataset.tone = tone;
  elements.toast.hidden = false;
  requestAnimationFrame(() => elements.toast.classList.add("is-visible"));
  toastTimer = window.setTimeout(() => {
    elements.toast.classList.remove("is-visible");
    window.setTimeout(() => {
      elements.toast.hidden = true;
    }, 180);
  }, 3_400);
}

function setProviderStatus(label: string, state: "ready" | "warning" | "loading"): void {
  elements.providerStatus.dataset.state = state;
  const text = elements.providerStatus.querySelector<HTMLElement>("span:last-child");
  if (text) text.textContent = label;
  elements.mobileProviderStatus.dataset.state = state;
  elements.mobileProviderStatus.textContent = label.replace(/^(OpenStreetMap|OSM 지도) · /, "");
}

function activePanelName(): string {
  return document.body.dataset.activePanel ?? "explore";
}

function syncMobileNavigation(target: string): void {
  document.querySelectorAll<HTMLButtonElement>("[data-mobile-target]").forEach((button) => {
    if (button.dataset.mobileTarget === target) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}

function updateSheetPeekCopy(): void {
  const strong = elements.sheetToggle.querySelector<HTMLElement>(".sheet-peek-copy strong");
  const small = elements.sheetToggle.querySelector<HTMLElement>(".sheet-peek-copy small");
  const top = visibleCandidates[0];
  if (strong) {
    strong.textContent = top
      ? `후보 ${visibleCandidates.length}곳 · 현재 1위 ${top.name}`
      : "조건에 맞는 후보가 없어요";
  }
  if (small) small.textContent = sheetState === "open" ? "아래로 밀어 지도만 보기" : "위로 밀어 조건과 순위 살펴보기";
}

function setPanelContentInteractive(interactive: boolean): void {
  [elements.panelHeading, elements.panelTabs, elements.panelScroll].forEach((element) => {
    element.inert = !interactive;
    if (interactive) element.removeAttribute("aria-hidden");
    else element.setAttribute("aria-hidden", "true");
  });
}

function setSheetState(nextState: SheetState, invalidateMap = true): void {
  sheetState = nextState;
  document.body.classList.toggle("mobile-panel-open", compactLayout.matches && nextState === "open");

  if (!compactLayout.matches) {
    delete elements.controlPanel.dataset.sheetState;
    elements.sheetToggle.setAttribute("aria-expanded", "false");
    elements.sheetToggle.setAttribute("aria-label", "탐색 도구");
    setPanelContentInteractive(true);
  } else {
    elements.controlPanel.dataset.sheetState = nextState;
    const open = nextState === "open";
    elements.sheetToggle.setAttribute("aria-expanded", String(open));
    elements.sheetToggle.setAttribute("aria-label", open ? "탐색 도구 접기" : "탐색 도구 펼치기");
    setPanelContentInteractive(open);
  }

  updateSheetPeekCopy();
  if (invalidateMap) window.setTimeout(() => map.invalidateSize(), 320);
}

function clearSheetDrag(): void {
  if (sheetDrag && elements.sheetToggle.hasPointerCapture(sheetDrag.pointerId)) {
    elements.sheetToggle.releasePointerCapture(sheetDrag.pointerId);
  }
  sheetDrag = null;
  elements.controlPanel.style.removeProperty("--sheet-drag-offset");
  document.body.classList.remove("is-sheet-dragging");
}

function handleResponsiveLayoutChange(): void {
  clearSheetDrag();
  document.body.classList.remove("mobile-panel-open", "mobile-inspector-open", "is-sheet-dragging");
  syncMobileNavigation("map");
  setSheetState("peek", false);
  if (compactLayout.matches && selectedId) document.body.classList.add("mobile-inspector-open");
  map.invalidateSize();
}

function previewCandidateInLists(id: string | null): void {
  document
    .querySelectorAll<HTMLElement>("#candidate-list > [data-candidate-id], #top-candidates > [data-candidate-id]")
    .forEach((item) => item.classList.toggle("is-previewed", id !== null && item.dataset.candidateId === id));
}

function rankDeltaMarkup(candidate: ScoredCandidate): string {
  const delta = rankDeltas.get(candidate.id) ?? 0;
  if (delta === 0) return "";
  const direction = delta > 0 ? "up" : "down";
  const symbol = delta > 0 ? "▲" : "▼";
  const label = `이전보다 ${Math.abs(delta)}계단 ${delta > 0 ? "상승" : "하락"}`;
  return `<small class="rank-delta" data-direction="${direction}" aria-hidden="true" title="${label}">${symbol}${Math.abs(delta)}</small>`;
}

function rankAriaLabel(candidate: ScoredCandidate): string {
  const delta = rankDeltas.get(candidate.id) ?? 0;
  if (delta === 0) return `${candidate.rank}위`;
  return `${candidate.rank}위, 이전보다 ${Math.abs(delta)}계단 ${delta > 0 ? "상승" : "하락"}`;
}

function updateRankDeltas(nextCandidates: readonly ScoredCandidate[]): void {
  const nextRanks = new Map(nextCandidates.map((candidate) => [candidate.id, candidate.rank]));
  rankDeltas = new Map();
  nextCandidates.forEach((candidate) => {
    const previous = previousRanks.get(candidate.id);
    if (previous !== undefined && previous !== candidate.rank) rankDeltas.set(candidate.id, previous - candidate.rank);
  });
  previousRanks = nextRanks;
}

function captureFlipRects(): Map<string, DOMRect> {
  const rects = new Map<string, DOMRect>();
  document.querySelectorAll<HTMLElement>("[data-flip-key]").forEach((element) => {
    const key = element.dataset.flipKey;
    const rect = element.getBoundingClientRect();
    if (key && rect.width > 0 && rect.height > 0) rects.set(key, rect);
  });
  return rects;
}

function cancelFlipAnimations(): void {
  window.cancelAnimationFrame(flipFrame);
  flipFrame = 0;
  [...flipAnimations.values()].forEach((animation) => animation.cancel());
  flipAnimations.clear();
}

function scheduleFlipAnimations(before: ReadonlyMap<string, DOMRect>): void {
  window.cancelAnimationFrame(flipFrame);
  if (reducedMotion.matches) {
    cancelFlipAnimations();
    return;
  }
  if (before.size === 0) return;
  flipFrame = window.requestAnimationFrame(() => {
    document.querySelectorAll<HTMLElement>("[data-flip-key]").forEach((element) => {
      const key = element.dataset.flipKey;
      const first = key ? before.get(key) : undefined;
      if (!key || !first) return;
      const last = element.getBoundingClientRect();
      if (last.width === 0 || last.height === 0) return;
      const deltaX = first.left - last.left;
      const deltaY = first.top - last.top;
      const scaleX = first.width / last.width;
      const scaleY = first.height / last.height;
      if (Math.abs(deltaX) < 0.5 && Math.abs(deltaY) < 0.5 && Math.abs(scaleX - 1) < 0.01 && Math.abs(scaleY - 1) < 0.01) return;

      flipAnimations.get(key)?.cancel();
      const animation = element.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`, transformOrigin: "top left" },
          { transform: "translate(0, 0) scale(1, 1)", transformOrigin: "top left" },
        ],
        { duration: 430, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
      flipAnimations.set(key, animation);
      animation.addEventListener("finish", () => {
        if (flipAnimations.get(key) === animation) flipAnimations.delete(key);
      }, { once: true });
      animation.addEventListener("cancel", () => {
        if (flipAnimations.get(key) === animation) flipAnimations.delete(key);
      }, { once: true });
    });
  });
}

function syncRangeProgress(input: HTMLInputElement, valueText?: string): void {
  const minimum = Number(input.min || 0);
  const maximum = Number(input.max || 100);
  const value = Number(input.value);
  const progress = Number.isFinite(value) && maximum > minimum
    ? Math.min(100, Math.max(0, ((value - minimum) / (maximum - minimum)) * 100))
    : 0;
  input.style.setProperty("--range-progress", `${progress}%`);
  if (valueText) input.setAttribute("aria-valuetext", valueText);
}

function restartEntryMotion(element: HTMLElement, className: string): void {
  element.classList.remove(className);
  if (reducedMotion.matches) return;
  window.requestAnimationFrame(() => {
    element.classList.add(className);
    window.setTimeout(() => element.classList.remove(className), 700);
  });
}

function renderActiveFilters(): void {
  const chips: Array<{ key: string; label: string }> = [];
  const candidateSearch = elements.candidateSearch.value.trim();
  if (candidateSearch) chips.push({ key: "search", label: `검색 · ${candidateSearch}` });
  if (elements.districtFilter.value !== "all") chips.push({ key: "district", label: elements.districtFilter.value });
  if (elements.leaseFilter.value !== "all") {
    chips.push({ key: "lease", label: elements.leaseFilter.selectedOptions[0]?.textContent ?? "계약 유형" });
  }
  if (Number(elements.depositLimit.value) < Number(elements.depositLimit.max)) {
    chips.push({ key: "deposit", label: `보증금 ≤ ${formatMoney(Number(elements.depositLimit.value))}` });
  }
  if (Number(elements.rentLimit.value) < Number(elements.rentLimit.max)) {
    chips.push({ key: "rent", label: `월세 ≤ ${formatMoney(Number(elements.rentLimit.value))}` });
  }

  elements.activeFilters.hidden = chips.length === 0;
  elements.activeFilters.innerHTML = chips
    .map(
      ({ key, label }) => `<button type="button" data-clear-filter="${key}" aria-label="${escapeMarkup(label)} 필터 해제"><span>${escapeMarkup(label)}</span><b aria-hidden="true">×</b></button>`,
    )
    .join("");
}

function clearSingleFilter(key: string): void {
  if (key === "search") elements.candidateSearch.value = "";
  if (key === "district") elements.districtFilter.value = "all";
  if (key === "lease") elements.leaseFilter.value = "all";
  if (key === "deposit") {
    elements.depositLimit.value = elements.depositLimit.max;
    elements.depositOutput.value = formatMoney(Number(elements.depositLimit.value));
    syncRangeProgress(elements.depositLimit, elements.depositOutput.value);
  }
  if (key === "rent") {
    elements.rentLimit.value = elements.rentLimit.max;
    elements.rentOutput.value = formatMoney(Number(elements.rentLimit.value));
    syncRangeProgress(elements.rentLimit, elements.rentOutput.value);
  }
  renderFilteredResults(true);
  window.requestAnimationFrame(() => {
    (elements.activeFilters.querySelector<HTMLButtonElement>("[data-clear-filter]") ?? elements.map).focus({ preventScroll: true });
  });
}

function getFilters(): CandidateFilters {
  const lease = elements.leaseFilter.value;
  return {
    search: elements.candidateSearch.value.trim(),
    dong: elements.districtFilter.value === "all" ? undefined : elements.districtFilter.value,
    contractType: lease === "jeonse" ? "전세" : lease === "monthly" ? "월세" : "전체",
    maxDeposit: Number(elements.depositLimit.value),
    maxRent: Number(elements.rentLimit.value),
  };
}

function toMappable(candidate: ScoredCandidate): MappableCandidate {
  return {
    id: candidate.id,
    rank: candidate.rank,
    name: candidate.name,
    district: candidate.dong,
    address: candidate.address,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    score: candidate.score,
  };
}

function candidateCard(candidate: ScoredCandidate, compact = false): string {
  const saved = favoriteIds.has(candidate.id);
  const compared = comparisonIds.has(candidate.id);
  return `
    <li class="candidate-card${selectedId === candidate.id ? " is-active" : ""}${compact ? " is-compact" : ""}" data-candidate-id="${escapeMarkup(candidate.id)}" data-flip-key="candidate:${escapeMarkup(candidate.id)}">
      <button class="candidate-select" type="button" data-action="select" data-candidate-id="${escapeMarkup(candidate.id)}" aria-label="${escapeMarkup(candidate.name)} 상세 보기" aria-current="${selectedId === candidate.id ? "true" : "false"}">
        <span class="candidate-rank" aria-label="${rankAriaLabel(candidate)}"><b>${String(candidate.rank).padStart(2, "0")}</b>${rankDeltaMarkup(candidate)}</span>
        <span class="candidate-card-copy">
          <strong>${escapeMarkup(candidate.name)}</strong>
          <small>${escapeMarkup(candidate.dong)} · ${escapeMarkup(formatContract(candidate))}</small>
        </span>
        <span class="candidate-score"><b>${Math.round(candidate.score)}</b><small>적합도</small></span>
      </button>
      <div class="candidate-quick-actions" aria-label="${escapeMarkup(candidate.name)} 빠른 작업">
        <button type="button" data-action="favorite" data-candidate-id="${escapeMarkup(candidate.id)}" aria-pressed="${saved}" aria-label="${saved ? "저장 취소" : "후보 저장"}">
          <span aria-hidden="true">${saved ? "♥" : "♡"}</span>
        </button>
        <button type="button" data-action="compare" data-candidate-id="${escapeMarkup(candidate.id)}" aria-pressed="${compared}">
          ${compared ? "비교 중" : "비교"}
        </button>
      </div>
    </li>`;
}

function renderCandidates(fitMap = false): void {
  const filtered = filterCandidates(scoredCandidates, getFilters());
  const ids = new Set(filtered.map((candidate) => candidate.id));
  visibleCandidates = scoredCandidates.filter((candidate) => ids.has(candidate.id));
  elements.candidateCount.textContent = `${visibleCandidates.length}개`;
  renderActiveFilters();
  updateSheetPeekCopy();
  elements.candidateList.setAttribute("aria-busy", "false");
  elements.candidateList.innerHTML = visibleCandidates.length
    ? visibleCandidates.map((candidate) => candidateCard(candidate)).join("")
    : `<li class="empty-state"><span class="empty-orbit" aria-hidden="true"></span><strong>조건에 맞는 후보가 없어요.</strong><p>보증금이나 월세 범위를 조금 넓혀보세요.</p></li>`;

  const mappable = visibleCandidates.map(toMappable);
  map.setCandidates(mappable);
  if (fitMap) map.fitCandidates(mappable);
  if (selectedId) {
    const selected = visibleCandidates.find((candidate) => candidate.id === selectedId);
    if (selected) map.selectCandidate(toMappable(selected), false);
    else {
      liveRequestGeneration += 1;
      selectedId = null;
      map.showLivePlaces([]);
      document.body.classList.remove("mobile-inspector-open");
      renderInspector();
    }
  }
}

function renderTopCandidates(): void {
  const top = visibleCandidates.slice(0, 3);
  elements.topCandidates.innerHTML = top.length
    ? top
        .map(
          (candidate) => `
            <li data-candidate-id="${escapeMarkup(candidate.id)}" data-flip-key="top:${escapeMarkup(candidate.id)}">
              <button type="button" data-action="select" data-candidate-id="${escapeMarkup(candidate.id)}">
                <span class="rail-rank" aria-label="${rankAriaLabel(candidate)}"><b>${candidate.rank}</b>${rankDeltaMarkup(candidate)}</span>
                <span><strong>${escapeMarkup(candidate.name)}</strong><small>${escapeMarkup(candidate.dong)} · ${escapeMarkup(formatContract(candidate))}</small></span>
                <b>${Math.round(candidate.score)}</b>
              </button>
              <button class="rail-compare" type="button" data-action="compare" data-candidate-id="${escapeMarkup(candidate.id)}" aria-pressed="${comparisonIds.has(candidate.id)}">${comparisonIds.has(candidate.id) ? "담김" : "+ 비교"}</button>
            </li>`,
        )
        .join("")
    : '<li class="rail-empty">현재 조건에 맞는 후보가 없습니다.</li>';
}

function renderAnalysisSummary(): void {
  const totalWeight = WEIGHT_KEYS.reduce((sum, key) => sum + weights[key], 0);
  const dominant = [...WEIGHT_KEYS].sort((left, right) => weights[right] - weights[left])[0] ?? "transit";
  const top = visibleCandidates[0];
  elements.analysisSummary.innerHTML = top
    ? `<span>현재 가장 중요한 기준</span><strong>${metricCopy[dominant].label} ${weights[dominant]}</strong><p>연 보증금 환산율 ${scoringOptions.depositAnnualRatePercent.toFixed(1)}%, 입력 합계 ${totalWeight}를 비율로 환산한 결과 <b>${escapeMarkup(top.name)}</b>이 ${Math.round(top.score)}로 가장 높습니다.</p>`
    : `<p>현재 필터에 맞는 후보가 없습니다.</p>`;
}

function renderSaved(): void {
  const saved = scoredCandidates.filter((candidate) => favoriteIds.has(candidate.id));
  elements.savedList.innerHTML = saved.length
    ? saved
        .map(
          (candidate) => `
            <li class="saved-card" data-candidate-id="${escapeMarkup(candidate.id)}" data-flip-key="saved:${escapeMarkup(candidate.id)}">
              <button type="button" data-action="select" data-candidate-id="${escapeMarkup(candidate.id)}">
                <span><strong>${escapeMarkup(candidate.name)}</strong><small>${escapeMarkup(formatContract(candidate))}</small></span><b>${Math.round(candidate.score)}</b>
              </button>
              <div><button type="button" data-action="compare" data-candidate-id="${escapeMarkup(candidate.id)}">${comparisonIds.has(candidate.id) ? "비교에서 빼기" : "비교 담기"}</button><button type="button" data-action="favorite" data-candidate-id="${escapeMarkup(candidate.id)}">저장 취소</button></div>
            </li>`,
        )
        .join("")
    : '<li class="empty-state"><span class="empty-orbit" aria-hidden="true"></span><strong>아직 저장한 후보가 없어요.</strong><p>후보 상세에서 하트를 누르면 이곳에 모입니다.</p></li>';
}

function renderComparison(): void {
  const compared = scoredCandidates.filter((candidate) => comparisonIds.has(candidate.id));
  elements.compareTray.hidden = compared.length === 0;
  elements.compareTray.dataset.count = String(compared.length);
  elements.openComparison.setAttribute(
    "aria-label",
    compared.length < 2 ? `비교할 후보 ${compared.length}곳, 두 곳 이상 필요` : `후보 ${compared.length}곳 한눈에 비교`,
  );
  elements.compareList.innerHTML = compared
    .map(
      (candidate) => `<li><button type="button" data-action="select" data-candidate-id="${escapeMarkup(candidate.id)}">${escapeMarkup(candidate.name)}</button><button type="button" data-action="compare" data-candidate-id="${escapeMarkup(candidate.id)}" aria-label="${escapeMarkup(candidate.name)} 비교에서 제거">×</button></li>`,
    )
    .join("");
  elements.openComparison.disabled = compared.length < 2;

  if (compared.length < 2) {
    elements.comparisonContent.innerHTML = '<div class="empty-state"><span class="empty-orbit" aria-hidden="true"></span><strong>비교할 후보를 두 곳 이상 담아주세요.</strong></div>';
    return;
  }

  const rows = WEIGHT_KEYS.map(
    (key) => `
      <tr>
        <th scope="row"><strong>${metricCopy[key].label}</strong><small>${metricCopy[key].description}</small></th>
        ${compared.map((candidate) => `<td><b>${Math.round(candidate.metricScores[key])}</b><span class="mini-bar"><i style="width:${candidate.metricScores[key]}%"></i></span></td>`).join("")}
      </tr>`,
  ).join("");
  elements.comparisonContent.innerHTML = `
    <div class="comparison-table-wrap">
      <table class="comparison-table">
        <caption>선택한 후보의 점수와 계약 조건 비교</caption>
        <thead><tr><th scope="col">기준</th>${compared.map((candidate) => `<th scope="col"><span>${candidate.rank}위</span><strong>${escapeMarkup(candidate.name)}</strong><small>${escapeMarkup(formatContract(candidate))}</small></th>`).join("")}</tr></thead>
        <tbody>
          <tr class="comparison-total"><th scope="row">종합 적합도</th>${compared.map((candidate) => `<td><b>${Math.round(candidate.score)}</b></td>`).join("")}</tr>
          ${rows}
          <tr><th scope="row"><strong>준공</strong></th>${compared.map((candidate) => `<td>${candidate.year}년</td>`).join("")}</tr>
          <tr><th scope="row"><strong>면적</strong></th>${compared.map((candidate) => `<td>${candidate.areaSqm.toFixed(1)}㎡</td>`).join("")}</tr>
        </tbody>
      </table>
    </div>`;
}

function metricMarkup(candidate: ScoredCandidate): string {
  return WEIGHT_KEYS.map((key) => {
    const score = candidate.metricScores[key];
    return `
      <div class="metric-row">
        <dt><strong>${metricCopy[key].label}</strong><small>${metricCopy[key].description}</small></dt>
        <dd><span class="metric-track"><i class="metric-fill is-entering" style="width:${score}%;--metric-value:${score}"></i></span><b>${Math.round(score)}</b></dd>
      </div>`;
  }).join("");
}

function evidenceMarkup(candidate: ScoredCandidate, snapshot?: LivePlaceSnapshot): string {
  const nearby = candidate.nearby;
  const base = [
    ["거래 표본", `${candidate.transactionDate} 계약 · ${candidate.year}년 준공 · ${candidate.areaSqm.toFixed(1)}㎡ · ${candidate.floor}층`],
    ["계약 금액", formatContract(candidate)],
    ["비용 환산", `${candidate.rawMetrics.budgetCost.toFixed(1)}만원/월 · 연 보증금 환산율 ${scoringOptions.depositAnnualRatePercent.toFixed(1)}% 가정`],
    ["교통 원자료", `1km 안 지하철 ${nearby.subway}곳 · 700m 안 버스 ${nearby.bus}곳`],
    ["생활 원자료", `편의 ${nearby.convenience}곳 · 공공 ${nearby.public}곳`],
    ["건강 원자료", `병원·약국 등 ${nearby.health}곳`],
    ["안전 원자료", `안전시설 ${nearby.safe} · 치안시설 ${nearby.police} · 위험사건 ${nearby.accident + nearby.disaster + nearby.traffic + nearby.unhealth}`],
    ["데이터 기준", `${candidate.asOf} 스냅샷 · ${candidate.confidence.explanation}`],
  ];
  const snapshotRows = snapshot
    ? snapshot.groups.map((group) => [
        `Kakao 표본 · ${group.label}`,
        `${formatNumber(group.count)}곳${group.truncated ? "+" : ""} 수집 · ${snapshot.radiusMeters / 1000}km · 코드별 최대 45건${group.partial ? " · 일부 항목 실패" : ""}`,
      ])
    : [];
  return [...base, ...snapshotRows]
    .map(
      ([label, value]) => `<li><span>${escapeMarkup(label ?? "")}</span><strong>${escapeMarkup(value ?? "")}</strong></li>`,
    )
    .join("");
}

function renderInspector(): void {
  const candidate = scoredCandidates.find((item) => item.id === selectedId);
  const hasCandidate = Boolean(candidate);
  elements.inspectorEmpty.hidden = hasCandidate;
  elements.inspectorContent.hidden = !hasCandidate;
  elements.inspector.classList.toggle("is-open", hasCandidate);
  document.body.classList.toggle("inspector-open", hasCandidate);
  if (!candidate) return;

  elements.inspectorName.textContent = candidate.name;
  elements.inspectorAddress.textContent = `${candidate.address} · ${formatContract(candidate)}`;
  elements.scoreValue.textContent = String(Math.round(candidate.score));
  elements.scoreRing.style.setProperty("--score", String(candidate.score));
  elements.scoreRing.dataset.score = String(Math.round(candidate.score));
  restartEntryMotion(elements.scoreRing, "is-score-updating");
  elements.scoreLabel.textContent = scoreLabel(candidate.score);
  elements.favoriteButton.setAttribute("aria-pressed", String(favoriteIds.has(candidate.id)));
  elements.favoriteButton.setAttribute("aria-label", favoriteIds.has(candidate.id) ? "후보 저장 취소" : "후보 저장");
  elements.metricList.innerHTML = metricMarkup(candidate);
  const snapshot = liveSnapshots.get(candidate.id);
  elements.evidenceList.innerHTML = evidenceMarkup(candidate, snapshot);
  elements.livePlacesSection.hidden = !snapshot;
  if (snapshot) {
    elements.liveObservedAt.dateTime = snapshot.observedAt;
    elements.liveObservedAt.textContent = `${formatObservedAt(snapshot.observedAt)} 관측${snapshot.partial ? " · 일부 응답" : ""}`;
    elements.livePlaceList.innerHTML = [...snapshot.places]
      .sort((left, right) => (left.distanceMeters ?? Number.POSITIVE_INFINITY) - (right.distanceMeters ?? Number.POSITIVE_INFINITY))
      .slice(0, 12)
      .map(livePlaceMarkup)
      .join("");
  } else {
    elements.liveObservedAt.removeAttribute("datetime");
    elements.liveObservedAt.textContent = "";
    elements.livePlaceList.replaceChildren();
  }
  elements.livePoiButton.disabled = !kakaoKey;
  elements.livePoiLabel.textContent = snapshot ? "Kakao 주변시설 다시 조회" : kakaoKey ? "Kakao 주변시설 실시간 조회" : "Kakao 키 설정 후 실시간 조회";
}

function recalculate(options: { fitMap?: boolean } = {}): void {
  const before = captureFlipRects();
  elements.candidateList.setAttribute("aria-busy", "true");
  elements.topCandidates.setAttribute("aria-busy", "true");
  const nextCandidates = scoreCandidates(CANDIDATES, weights, scoringOptions);
  updateRankDeltas(nextCandidates);
  scoredCandidates = nextCandidates;
  renderCandidates(options.fitMap);
  renderTopCandidates();
  renderAnalysisSummary();
  renderSaved();
  renderComparison();
  renderInspector();
  elements.candidateList.setAttribute("aria-busy", "false");
  elements.topCandidates.setAttribute("aria-busy", "false");
  scheduleFlipAnimations(before);
}

function renderFilteredResults(fitMap = false): void {
  const before = captureFlipRects();
  renderCandidates(fitMap);
  renderTopCandidates();
  renderAnalysisSummary();
  scheduleFlipAnimations(before);
}

function clearFiltersToReveal(candidateId: string): boolean {
  if (filterCandidates(scoredCandidates, getFilters()).some((candidate) => candidate.id === candidateId)) return false;
  elements.candidateSearch.value = "";
  elements.districtFilter.value = "all";
  elements.leaseFilter.value = "all";
  elements.depositLimit.value = elements.depositLimit.max;
  elements.rentLimit.value = elements.rentLimit.max;
  elements.depositOutput.value = formatMoney(Number(elements.depositLimit.value));
  elements.rentOutput.value = formatMoney(Number(elements.rentLimit.value));
  syncRangeProgress(elements.depositLimit, elements.depositOutput.value);
  syncRangeProgress(elements.rentLimit, elements.rentOutput.value);
  return true;
}

function selectCandidate(id: string, move = true, focusInspector = false): void {
  const candidate = scoredCandidates.find((item) => item.id === id);
  if (!candidate) return;
  const filtersCleared = clearFiltersToReveal(id);
  selectedId = id;
  liveRequestGeneration += 1;
  renderCandidates(false);
  if (filtersCleared) {
    renderTopCandidates();
    renderAnalysisSummary();
  }
  renderInspector();
  map.showLivePlaces(liveSnapshots.get(id)?.places ?? []);
  map.selectCandidate(toMappable(candidate), move);
  if (compactLayout.matches) {
    syncMobileNavigation("map");
    setSheetState("peek", false);
    document.body.classList.add("mobile-inspector-open");
  }
  if (focusInspector) requestAnimationFrame(() => elements.inspectorName.focus({ preventScroll: true }));
  if (filtersCleared) showToast("저장한 후보를 보여드리기 위해 탐색 필터를 초기화했습니다.");
}

function restoreActionFocus(action: string, candidateId: string, scope: HTMLElement | null): void {
  requestAnimationFrame(() => {
    const root: ParentNode = scope ?? document;
    const target = [...root.querySelectorAll<HTMLButtonElement>("[data-action][data-candidate-id]")]
      .find((button) => button.dataset.action === action && button.dataset.candidateId === candidateId);
    const nextAction = root.querySelector<HTMLButtonElement>("[data-action][data-candidate-id]");
    const fallback = scope?.id === "saved-list"
      ? document.querySelector<HTMLButtonElement>("#saved-tab")
      : scope?.id === "candidate-list"
        ? document.querySelector<HTMLButtonElement>("#explore-tab")
        : elements.map;
    (target ?? nextAction ?? fallback)?.focus({ preventScroll: true });
  });
}

function toggleFavorite(id: string): void {
  if (favoriteIds.has(id)) favoriteIds.delete(id);
  else favoriteIds.add(id);
  writeStored("favorites", [...favoriteIds]);
  renderCandidates(false);
  renderTopCandidates();
  renderSaved();
  renderInspector();
  showToast(favoriteIds.has(id) ? "저장 목록에 담았습니다." : "저장 목록에서 뺐습니다.");
}

function toggleComparison(id: string): void {
  if (comparisonIds.has(id)) comparisonIds.delete(id);
  else if (comparisonIds.size >= 3) {
    showToast("비교는 최대 세 곳까지 담을 수 있어요.", "error");
    return;
  } else comparisonIds.add(id);
  writeStored("comparison", [...comparisonIds]);
  renderCandidates(false);
  renderTopCandidates();
  renderSaved();
  renderComparison();
}

function activateTab(tab: string, focus = false): void {
  document.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((button) => {
    const active = button.dataset.tab === tab;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
    if (active && focus) button.focus();
  });
  document.querySelectorAll<HTMLElement>("[data-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.panel !== tab;
  });
  document.body.dataset.activePanel = tab;
  if (compactLayout.matches) {
    syncMobileNavigation(tab);
    if (!document.body.classList.contains("mobile-inspector-open")) setSheetState("open", false);
  }
}

async function runPlaceSearch(): Promise<void> {
  const keyword = elements.placeSearch.value.trim();
  if (!keyword) return;

  if (!kakaoKey) {
    showToast("Kakao 키를 연결하면 일반 장소 검색을 사용할 수 있어요.");
    return;
  }
  const requestGeneration = ++placeSearchGeneration;
  const submit = elements.searchForm.querySelector<HTMLButtonElement>("button[type=submit]");
  if (submit) submit.disabled = true;
  elements.searchForm.setAttribute("aria-busy", "true");
  try {
    const results = await searchKakaoPlaces(kakaoKey, keyword, map.getCenter());
    if (requestGeneration !== placeSearchGeneration) return;
    map.showSearchResults(results);
    setProviderStatus("OSM 지도 · Kakao 실시간", "ready");
    showToast(results.length ? `Kakao에서 ${results.length}개 장소를 지도에 표시했습니다.` : "일치하는 Kakao 장소가 없습니다.");
  } catch (error) {
    if (requestGeneration !== placeSearchGeneration) return;
    setProviderStatus("OSM 지도 · Kakao 확인 필요", "warning");
    showToast(error instanceof Error ? error.message : "장소 검색에 실패했습니다.", "error");
  } finally {
    if (requestGeneration === placeSearchGeneration) {
      if (submit) submit.disabled = false;
      elements.searchForm.removeAttribute("aria-busy");
    }
  }
}

async function loadLivePlaces(): Promise<void> {
  const candidate = scoredCandidates.find((item) => item.id === selectedId);
  if (!candidate || !kakaoKey) return;
  const requestGeneration = ++liveRequestGeneration;
  const originalText = elements.livePoiLabel.textContent;
  elements.livePoiButton.disabled = true;
  elements.livePoiLabel.textContent = "1km 생활권을 확인하는 중…";
  try {
    const snapshot = await fetchNearbyPlaces(kakaoKey, candidate.latitude, candidate.longitude);
    if (requestGeneration !== liveRequestGeneration || selectedId !== candidate.id) return;
    liveSnapshots.set(candidate.id, snapshot);
    map.showLivePlaces(snapshot.places);
    renderInspector();
    setProviderStatus(snapshot.partial ? "OSM 지도 · Kakao 일부 응답" : "OSM 지도 · Kakao 실시간", snapshot.partial ? "warning" : "ready");
    showToast(`주변시설 표본 ${snapshot.places.length}곳을 수집했습니다${snapshot.partial ? "(일부 항목 제외)" : ""}. 고정 점수에는 섞지 않았어요.`);
  } catch (error) {
    if (requestGeneration !== liveRequestGeneration || selectedId !== candidate.id) return;
    elements.livePoiLabel.textContent = originalText;
    setProviderStatus("OSM 지도 · Kakao 도메인 확인", "warning");
    showToast(error instanceof Error ? error.message : "주변시설을 불러오지 못했습니다.", "error");
  } finally {
    if (requestGeneration === liveRequestGeneration && selectedId === candidate.id) {
      elements.livePoiButton.disabled = !kakaoKey;
    }
  }
}

function bindEvents(): void {
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const target = event.target;
    const clearFilterButton = target.closest<HTMLButtonElement>("[data-clear-filter]");
    if (clearFilterButton?.dataset.clearFilter) {
      clearSingleFilter(clearFilterButton.dataset.clearFilter);
      return;
    }
    const actionButton = target.closest<HTMLButtonElement>("[data-action]");
    if (actionButton?.dataset.candidateId) {
      const { action, candidateId } = actionButton.dataset;
      const actionScope = actionButton.closest<HTMLElement>("#candidate-list, #saved-list, #top-candidates, #compare-list");
      if (action === "select") {
        inspectorReturnTarget = {
          action,
          candidateId,
          scopeId: actionScope?.id ?? "",
          activePanel: activePanelName(),
          sheetState,
        };
        selectCandidate(candidateId, true, true);
      }
      if (action === "favorite") {
        toggleFavorite(candidateId);
        restoreActionFocus(action, candidateId, actionScope);
      }
      if (action === "compare") {
        toggleComparison(candidateId);
        restoreActionFocus(action, candidateId, actionScope);
      }
      return;
    }
    const tabButton = target.closest<HTMLButtonElement>("[data-tab]");
    if (tabButton?.dataset.tab) activateTab(tabButton.dataset.tab);
  });

  const previewCandidateFromEvent = (eventTarget: EventTarget | null): string | null => {
    if (!(eventTarget instanceof Element)) return null;
    const control = eventTarget.closest<HTMLElement>("[data-candidate-id]");
    if (!control?.dataset.candidateId) return null;
    if (!control.closest("#candidate-list, #top-candidates")) return null;
    return control.dataset.candidateId;
  };
  document.addEventListener("pointerover", (event) => {
    const id = previewCandidateFromEvent(event.target);
    const previousId = previewCandidateFromEvent(event.relatedTarget);
    if (id && id !== previousId) map.previewCandidate(id);
  });
  document.addEventListener("pointerout", (event) => {
    const id = previewCandidateFromEvent(event.target);
    const nextId = previewCandidateFromEvent(event.relatedTarget);
    if (id && id !== nextId) map.previewCandidate(nextId);
  });
  document.addEventListener("focusin", (event) => {
    const id = previewCandidateFromEvent(event.target);
    if (id) map.previewCandidate(id);
  });
  document.addEventListener("focusout", (event) => {
    const id = previewCandidateFromEvent(event.target);
    const nextId = previewCandidateFromEvent(event.relatedTarget);
    if (id && id !== nextId) map.previewCandidate(nextId);
  });

  document.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach((button, index, buttons) => {
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
      const next = buttons[nextIndex];
      if (next?.dataset.tab) activateTab(next.dataset.tab, true);
    });
  });

  elements.searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void runPlaceSearch();
  });
  elements.candidateSearch.addEventListener("input", () => {
    renderFilteredResults(false);
  });
  [elements.districtFilter, elements.leaseFilter].forEach((control) => {
    control.addEventListener("change", () => {
      renderFilteredResults(true);
    });
  });
  [elements.depositLimit, elements.rentLimit].forEach((control) => {
    control.addEventListener("input", () => {
      elements.depositOutput.value = formatMoney(Number(elements.depositLimit.value));
      elements.rentOutput.value = formatMoney(Number(elements.rentLimit.value));
      syncRangeProgress(elements.depositLimit, elements.depositOutput.value);
      syncRangeProgress(elements.rentLimit, elements.rentOutput.value);
      renderFilteredResults(false);
    });
    control.addEventListener("change", () => map.fitCandidates(visibleCandidates.map(toMappable)));
  });

  document.querySelectorAll<HTMLInputElement>("[data-weight]").forEach((input) => {
    const key = input.dataset.weight as WeightKey;
    input.value = String(weights[key]);
    requiredElement<HTMLOutputElement>(`[data-weight-output="${key}"]`).value = String(weights[key]);
    syncRangeProgress(input, `${weights[key]}점`);
    input.addEventListener("input", () => {
      weights = { ...weights, [key]: Number(input.value) };
      requiredElement<HTMLOutputElement>(`[data-weight-output="${key}"]`).value = input.value;
      syncRangeProgress(input, `${input.value}점`);
      if (WEIGHT_KEYS.every((weightKey) => weights[weightKey] === 0)) {
        weights = { ...DEFAULT_WEIGHTS };
        document.querySelectorAll<HTMLInputElement>("[data-weight]").forEach((weightInput) => {
          const weightKey = weightInput.dataset.weight as WeightKey;
          weightInput.value = String(weights[weightKey]);
          requiredElement<HTMLOutputElement>(`[data-weight-output="${weightKey}"]`).value = String(weights[weightKey]);
          syncRangeProgress(weightInput, `${weights[weightKey]}점`);
        });
        showToast("모든 기준을 0으로 둘 수 없어 같은 비율로 되돌렸습니다.");
      }
      writeStored("weights", weights);
      recalculate();
    });
  });
  elements.depositRate.value = String(scoringOptions.depositAnnualRatePercent);
  elements.depositRateOutput.value = `${scoringOptions.depositAnnualRatePercent.toFixed(1)}%`;
  syncRangeProgress(elements.depositRate, elements.depositRateOutput.value);
  elements.depositRate.addEventListener("input", () => {
    scoringOptions = { depositAnnualRatePercent: normalizeDepositRate(elements.depositRate.value) };
    elements.depositRateOutput.value = `${scoringOptions.depositAnnualRatePercent.toFixed(1)}%`;
    syncRangeProgress(elements.depositRate, elements.depositRateOutput.value);
    writeStored("depositAnnualRatePercent", scoringOptions.depositAnnualRatePercent);
    recalculate();
  });
  elements.resetWeights.addEventListener("click", () => {
    weights = { ...DEFAULT_WEIGHTS };
    scoringOptions = { ...DEFAULT_SCORING_OPTIONS };
    elements.depositRate.value = String(scoringOptions.depositAnnualRatePercent);
    elements.depositRateOutput.value = `${scoringOptions.depositAnnualRatePercent.toFixed(1)}%`;
    syncRangeProgress(elements.depositRate, elements.depositRateOutput.value);
    document.querySelectorAll<HTMLInputElement>("[data-weight]").forEach((input) => {
      const key = input.dataset.weight as WeightKey;
      input.value = String(weights[key]);
      requiredElement<HTMLOutputElement>(`[data-weight-output="${key}"]`).value = String(weights[key]);
      syncRangeProgress(input, `${weights[key]}점`);
    });
    writeStored("weights", weights);
    writeStored("depositAnnualRatePercent", scoringOptions.depositAnnualRatePercent);
    recalculate();
    showToast("가중치와 보증금 환산율을 기본값으로 되돌렸습니다.");
  });

  elements.favoriteButton.addEventListener("click", () => {
    if (selectedId) toggleFavorite(selectedId);
  });
  elements.livePoiButton.addEventListener("click", () => void loadLivePlaces());
  elements.closeInspector.addEventListener("click", () => {
    const returnTarget = inspectorReturnTarget;
    liveRequestGeneration += 1;
    selectedId = null;
    map.showLivePlaces([]);
    map.selectCandidate(null, false);
    map.previewCandidate(null);
    document.body.classList.remove("mobile-inspector-open");
    renderCandidates(false);
    renderInspector();
    if (compactLayout.matches) {
      if (returnTarget?.sheetState === "open") {
        activateTab(returnTarget.activePanel);
        setSheetState("open", false);
      } else {
        syncMobileNavigation("map");
        setSheetState("peek", false);
      }
    }
    inspectorReturnTarget = null;
    requestAnimationFrame(() => {
      const returnScope = returnTarget?.scopeId ? document.getElementById(returnTarget.scopeId) : null;
      const candidateControl = returnTarget && returnScope
        ? [...returnScope.querySelectorAll<HTMLButtonElement>("[data-action][data-candidate-id]")]
            .find((button) => button.dataset.action === returnTarget.action && button.dataset.candidateId === returnTarget.candidateId)
        : null;
      (candidateControl ?? elements.map).focus({ preventScroll: true });
    });
  });
  elements.locateButton.addEventListener("click", async () => {
    elements.locateButton.disabled = true;
    try {
      await map.locate();
      showToast("현재 위치를 지도에 표시했습니다.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "현재 위치를 확인할 수 없습니다.", "error");
    } finally {
      elements.locateButton.disabled = false;
    }
  });

  elements.openComparison.addEventListener("click", () => {
    if (!elements.comparisonDialog.open) elements.comparisonDialog.showModal();
  });
  elements.closeComparison.addEventListener("click", () => elements.comparisonDialog.close());
  elements.openMethod.addEventListener("click", () => {
    if (!elements.methodDialog.open) elements.methodDialog.showModal();
  });
  elements.openMethodMobile.addEventListener("click", () => {
    if (!elements.methodDialog.open) elements.methodDialog.showModal();
  });
  elements.closeMethod.addEventListener("click", () => elements.methodDialog.close());
  [elements.comparisonDialog, elements.methodDialog].forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });

  elements.sheetToggle.style.touchAction = "none";
  elements.sheetToggle.addEventListener("click", () => {
    if (!compactLayout.matches) return;
    if (suppressSheetClick) {
      suppressSheetClick = false;
      return;
    }
    const nextState = sheetState === "open" ? "peek" : "open";
    syncMobileNavigation(nextState === "open" ? activePanelName() : "map");
    setSheetState(nextState);
  });
  elements.sheetToggle.addEventListener("pointerdown", (event) => {
    if (!compactLayout.matches || event.button !== 0 || !event.isPrimary) return;
    clearSheetDrag();
    sheetDrag = {
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      startedAt: performance.now(),
      origin: sheetState,
      moved: false,
    };
    elements.sheetToggle.setPointerCapture(event.pointerId);
    document.body.classList.add("is-sheet-dragging");
  });
  elements.sheetToggle.addEventListener("pointermove", (event) => {
    if (!sheetDrag || sheetDrag.pointerId !== event.pointerId) return;
    const deltaY = event.clientY - sheetDrag.startY;
    sheetDrag.lastY = event.clientY;
    sheetDrag.moved ||= Math.abs(deltaY) > 7;
    const limitedDelta = sheetDrag.origin === "open"
      ? Math.min(190, Math.max(-24, deltaY))
      : Math.min(72, Math.max(-190, deltaY));
    elements.controlPanel.style.setProperty("--sheet-drag-offset", `${limitedDelta}px`);
    event.preventDefault();
  });
  const finishSheetDrag = (event: PointerEvent, cancelled = false): void => {
    if (!sheetDrag || sheetDrag.pointerId !== event.pointerId) return;
    const drag = sheetDrag;
    const deltaY = drag.lastY - drag.startY;
    const elapsed = Math.max(1, performance.now() - drag.startedAt);
    const velocity = deltaY / elapsed;
    let nextState = drag.origin;
    if (!cancelled && !drag.moved) {
      clearSheetDrag();
      return;
    }
    if (!cancelled) {
      if (drag.origin === "peek" && (deltaY < -SHEET_DRAG_THRESHOLD || velocity < -SHEET_FLICK_VELOCITY)) nextState = "open";
      if (drag.origin === "open" && (deltaY > SHEET_DRAG_THRESHOLD || velocity > SHEET_FLICK_VELOCITY)) nextState = "peek";
    }
    suppressSheetClick = drag.moved;
    if (drag.moved) window.setTimeout(() => { suppressSheetClick = false; }, 0);
    clearSheetDrag();
    syncMobileNavigation(nextState === "open" ? activePanelName() : "map");
    setSheetState(nextState);
  };
  elements.sheetToggle.addEventListener("pointerup", (event) => finishSheetDrag(event));
  elements.sheetToggle.addEventListener("pointercancel", (event) => finishSheetDrag(event, true));

  document.querySelectorAll<HTMLButtonElement>("[data-mobile-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = button.dataset.mobileTarget ?? "map";
      clearSheetDrag();
      liveRequestGeneration += 1;
      selectedId = null;
      inspectorReturnTarget = null;
      map.showLivePlaces([]);
      map.selectCandidate(null, false);
      map.previewCandidate(null);
      renderCandidates(false);
      renderInspector();
      syncMobileNavigation(target);
      document.body.classList.remove("mobile-inspector-open");
      if (target === "map") {
        setSheetState("peek", false);
      } else {
        activateTab(target);
        setSheetState("open", false);
      }
      map.invalidateSize();
    });
  });

  document.addEventListener("keydown", (event) => {
    const active = document.activeElement;
    const typing = active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement;
    if (event.key === "/" && !typing) {
      event.preventDefault();
      if (compactLayout.matches) {
        activateTab("explore");
        setSheetState("open", false);
        window.requestAnimationFrame(() => elements.placeSearch.focus());
      } else elements.placeSearch.focus();
    }
    if (event.key === "?" && !typing && !elements.methodDialog.open) elements.methodDialog.showModal();
    if (event.key === "Escape" && compactLayout.matches && !elements.comparisonDialog.open && !elements.methodDialog.open) {
      if (document.body.classList.contains("mobile-inspector-open")) elements.closeInspector.click();
      else if (sheetState === "open") {
        syncMobileNavigation("map");
        setSheetState("peek");
        elements.sheetToggle.focus({ preventScroll: true });
      }
    }
  });
  compactLayout.addEventListener("change", handleResponsiveLayoutChange);
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) cancelFlipAnimations();
  });
  window.addEventListener("resize", () => {
    if (sheetDrag) {
      clearSheetDrag();
      setSheetState(sheetState, false);
    }
    map.invalidateSize();
  }, { passive: true });
}

async function initializeProviders(): Promise<void> {
  if (!kakaoKey) {
    setProviderStatus("OpenStreetMap · Kakao 미설정", "warning");
    return;
  }
  setProviderStatus("OpenStreetMap · Kakao 확인 중", "loading");
  try {
    await loadKakaoPlacesSdk(kakaoKey);
    setProviderStatus("OSM 지도 · Kakao 실시간", "ready");
  } catch {
    setProviderStatus("OSM 지도 · Kakao 도메인 확인", "warning");
  }
}

function initialize(): void {
  const dataText = elements.dataStatus.querySelector<HTMLElement>("span:last-child");
  elements.dataStatus.dataset.state = "ready";
  if (dataText) dataText.textContent = `${CANDIDATE_DATASET_METADATA.asOf.slice(0, 4)} 스냅샷 · ${CANDIDATES.length}개 후보`;
  elements.mobileDataStatus.textContent = `${CANDIDATE_DATASET_METADATA.asOf.slice(0, 4)} 스냅샷 · ${CANDIDATES.length}개 후보`;
  const dongs = [...new Set(CANDIDATES.map((candidate) => candidate.dong))].sort((left, right) =>
    left.localeCompare(right, "ko-KR"),
  );
  elements.districtFilter.innerHTML = [
    '<option value="all">마포구 전체</option>',
    ...dongs.map((dong) => `<option value="${escapeMarkup(dong)}">${escapeMarkup(dong)}</option>`),
  ].join("");
  const depositCeiling = Math.ceil(Math.max(...CANDIDATES.map((candidate) => candidate.deposit)) / 10_000) * 10_000;
  elements.depositLimit.max = String(depositCeiling);
  elements.depositLimit.value = String(depositCeiling);
  elements.depositOutput.value = formatMoney(Number(elements.depositLimit.value));
  elements.rentOutput.value = formatMoney(Number(elements.rentLimit.value));
  syncRangeProgress(elements.depositLimit, elements.depositOutput.value);
  syncRangeProgress(elements.rentLimit, elements.rentOutput.value);
  bindEvents();
  syncMobileNavigation("map");
  setSheetState("peek", false);
  recalculate({ fitMap: true });
  void initializeProviders();
}

initialize();

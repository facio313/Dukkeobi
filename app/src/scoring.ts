import { DEFAULT_SCORING_OPTIONS, DEFAULT_WEIGHTS } from "./data";
import {
  WEIGHT_KEYS,
  type Candidate,
  type CandidateComparison,
  type CandidateFilters,
  type MetricScores,
  type PercentileDirection,
  type RawScoreMetrics,
  type ScoredCandidate,
  type ScoringOptions,
  type ScoreWeights,
  type WeightKey,
} from "./types";

const NEUTRAL_SCORE = 50;
const SCORE_MIN = 0;
const SCORE_MAX = 100;
const COMPARISON_EPSILON = 1e-9;

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

function calculateFinite(values: readonly number[], calculate: () => number): number {
  if (!values.every(isFiniteNumber)) return Number.NaN;
  const result = calculate();
  return isFiniteNumber(result) ? result : Number.NaN;
}

function clampScore(value: number): number {
  if (!isFiniteNumber(value)) return NEUTRAL_SCORE;
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, value));
}

function normalizeScoringOptions(options: Partial<ScoringOptions> = DEFAULT_SCORING_OPTIONS): ScoringOptions {
  const rate = options.depositAnnualRatePercent ?? DEFAULT_SCORING_OPTIONS.depositAnnualRatePercent;
  return {
    depositAnnualRatePercent: isFiniteNumber(rate) && rate >= 0 && rate <= 100
      ? rate
      : DEFAULT_SCORING_OPTIONS.depositAnnualRatePercent,
  };
}

export function deriveRawMetrics(
  candidate: Candidate,
  options: Partial<ScoringOptions> = DEFAULT_SCORING_OPTIONS,
): RawScoreMetrics {
  const nearby = candidate.nearby;
  const { depositAnnualRatePercent } = normalizeScoringOptions(options);
  const transit = calculateFinite(
    [nearby.subway, nearby.bus],
    () => nearby.subway * 12 + nearby.bus,
  );
  const daily = calculateFinite(
    [nearby.convenience, nearby.public],
    () => nearby.convenience + nearby.public * 2,
  );
  const health = isFiniteNumber(nearby.health) ? nearby.health : Number.NaN;
  const risk = calculateFinite(
    [nearby.accident, nearby.disaster, nearby.traffic, nearby.unhealth],
    () =>
      nearby.accident * 5 +
      nearby.disaster * 4 +
      nearby.traffic * 3 +
      nearby.unhealth * 2,
  );
  const safety = calculateFinite(
    [nearby.safe, nearby.police, risk],
    () => nearby.safe * 3 + nearby.police * 4 - risk,
  );
  const budgetCost = calculateFinite(
    [candidate.monthlyRent, candidate.deposit, depositAnnualRatePercent],
    () => candidate.monthlyRent + (candidate.deposit * depositAnnualRatePercent) / 1_200,
  );

  return { transit, daily, health, safety, budgetCost, risk };
}

/**
 * Converts values to average-rank percentiles. Equal values receive the same
 * midpoint rank. Unknown values are neutral rather than silently becoming best
 * or worst. A cohort with no variation is neutral by definition.
 */
export function tieAwarePercentiles(
  values: readonly number[],
  direction: PercentileDirection = "higher",
): number[] {
  const finiteValues = values.filter(isFiniteNumber);
  if (finiteValues.length <= 1) return values.map(() => NEUTRAL_SCORE);

  const first = finiteValues[0];
  if (first === undefined || finiteValues.every((value) => value === first)) {
    return values.map(() => NEUTRAL_SCORE);
  }

  const denominator = finiteValues.length - 1;
  return values.map((value) => {
    if (!isFiniteNumber(value)) return NEUTRAL_SCORE;

    let lowerCount = 0;
    let equalCount = 0;
    for (const cohortValue of finiteValues) {
      if (cohortValue < value) lowerCount += 1;
      if (cohortValue === value) equalCount += 1;
    }

    const averageZeroBasedRank = lowerCount + (equalCount - 1) / 2;
    const higherIsBetterScore = (averageZeroBasedRank / denominator) * SCORE_MAX;
    return direction === "lower" ? SCORE_MAX - higherIsBetterScore : higherIsBetterScore;
  });
}

/**
 * Sanitizes weights and expresses them as percentages. Omitted dimensions keep
 * their default value; non-finite and negative values become zero. If every
 * dimension is zero, the documented 20/20/20/20/20 default is restored.
 */
export function normalizeWeights(weights: Partial<ScoreWeights> = DEFAULT_WEIGHTS): ScoreWeights {
  const sanitized = {} as Record<WeightKey, number>;
  for (const key of WEIGHT_KEYS) {
    const value = weights[key] ?? DEFAULT_WEIGHTS[key];
    sanitized[key] = isFiniteNumber(value) && value > 0 ? value : 0;
  }

  const total = WEIGHT_KEYS.reduce((sum, key) => sum + sanitized[key], 0);
  if (total === 0) return DEFAULT_WEIGHTS;

  return {
    transit: (sanitized.transit / total) * SCORE_MAX,
    daily: (sanitized.daily / total) * SCORE_MAX,
    health: (sanitized.health / total) * SCORE_MAX,
    safety: (sanitized.safety / total) * SCORE_MAX,
    budget: (sanitized.budget / total) * SCORE_MAX,
  };
}

export function calculateWeightedScore(
  metricScores: MetricScores,
  weights: Partial<ScoreWeights> = DEFAULT_WEIGHTS,
): number {
  const normalizedWeights = normalizeWeights(weights);
  const weightedTotal = WEIGHT_KEYS.reduce(
    (sum, key) => sum + clampScore(metricScores[key]) * normalizedWeights[key],
    0,
  );
  return clampScore(weightedTotal / SCORE_MAX);
}

function percentileScores(rawMetrics: readonly RawScoreMetrics[]): Readonly<Record<WeightKey, number[]>> {
  return {
    transit: tieAwarePercentiles(rawMetrics.map((metrics) => metrics.transit)),
    daily: tieAwarePercentiles(rawMetrics.map((metrics) => metrics.daily)),
    health: tieAwarePercentiles(rawMetrics.map((metrics) => metrics.health)),
    safety: tieAwarePercentiles(rawMetrics.map((metrics) => metrics.safety)),
    budget: tieAwarePercentiles(
      rawMetrics.map((metrics) => metrics.budgetCost),
      "lower",
    ),
  };
}

/** Scores and ranks one complete comparison cohort without mutating its input. */
export function scoreCandidates(
  candidates: readonly Candidate[],
  weights: Partial<ScoreWeights> = DEFAULT_WEIGHTS,
  options: Partial<ScoringOptions> = DEFAULT_SCORING_OPTIONS,
): ScoredCandidate[] {
  if (candidates.length === 0) return [];

  const rawMetrics = candidates.map((candidate) => deriveRawMetrics(candidate, options));
  const scoresByMetric = percentileScores(rawMetrics);
  const scored = candidates.map<ScoredCandidate>((candidate, index) => {
    const candidateRawMetrics = rawMetrics[index];
    if (candidateRawMetrics === undefined) {
      throw new RangeError("Candidate and metric arrays became misaligned.");
    }

    const metricScores: MetricScores = {
      transit: scoresByMetric.transit[index] ?? NEUTRAL_SCORE,
      daily: scoresByMetric.daily[index] ?? NEUTRAL_SCORE,
      health: scoresByMetric.health[index] ?? NEUTRAL_SCORE,
      safety: scoresByMetric.safety[index] ?? NEUTRAL_SCORE,
      budget: scoresByMetric.budget[index] ?? NEUTRAL_SCORE,
    };

    return {
      ...candidate,
      score: calculateWeightedScore(metricScores, weights),
      metricScores,
      rawMetrics: candidateRawMetrics,
      rank: 0,
    };
  });

  return scored
    .sort(compareScoredCandidates)
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));
}

function normalizedSearchText(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase("ko-KR").replace(/\s+/g, "");
}

/** Applies inclusive budget bounds and preserves the incoming ranking/order. */
export function filterCandidates<T extends Candidate>(
  candidates: readonly T[],
  filters: CandidateFilters = {},
): T[] {
  const search = normalizedSearchText(filters.search ?? "");
  const dong = normalizedSearchText(filters.dong ?? "");
  const hasDongFilter = dong !== "" && dong !== normalizedSearchText("전체");
  const hasDepositLimit =
    filters.maxDeposit !== undefined && isFiniteNumber(filters.maxDeposit);
  const hasRentLimit = filters.maxRent !== undefined && isFiniteNumber(filters.maxRent);

  return candidates.filter((candidate) => {
    if (search !== "") {
      const searchable = normalizedSearchText(
        [
          candidate.name,
          candidate.district,
          candidate.dong,
          candidate.address,
          candidate.propertyType,
          candidate.contractType,
        ].join(" "),
      );
      if (!searchable.includes(search)) return false;
    }

    if (hasDongFilter && normalizedSearchText(candidate.dong) !== dong) return false;
    if (
      filters.contractType !== undefined &&
      filters.contractType !== "전체" &&
      candidate.contractType !== filters.contractType
    ) {
      return false;
    }
    if (hasDepositLimit && candidate.deposit > (filters.maxDeposit as number)) return false;
    if (hasRentLimit && candidate.monthlyRent > (filters.maxRent as number)) return false;
    return true;
  });
}

/** Sort comparator: score descending, cost ascending, newer year, stable id. */
export function compareScoredCandidates(left: ScoredCandidate, right: ScoredCandidate): number {
  const leftScore = isFiniteNumber(left.score) ? left.score : Number.NEGATIVE_INFINITY;
  const rightScore = isFiniteNumber(right.score) ? right.score : Number.NEGATIVE_INFINITY;
  if (leftScore !== rightScore) return leftScore > rightScore ? -1 : 1;

  const leftCost = isFiniteNumber(left.rawMetrics.budgetCost)
    ? left.rawMetrics.budgetCost
    : Number.POSITIVE_INFINITY;
  const rightCost = isFiniteNumber(right.rawMetrics.budgetCost)
    ? right.rawMetrics.budgetCost
    : Number.POSITIVE_INFINITY;
  if (leftCost !== rightCost) return leftCost < rightCost ? -1 : 1;

  const leftYear = isFiniteNumber(left.year) ? left.year : Number.NEGATIVE_INFINITY;
  const rightYear = isFiniteNumber(right.year) ? right.year : Number.NEGATIVE_INFINITY;
  if (leftYear !== rightYear) return leftYear > rightYear ? -1 : 1;

  if (left.id === right.id) return 0;
  return left.id < right.id ? -1 : 1;
}

function comparableScore(value: number): number {
  return isFiniteNumber(value) ? value : NEUTRAL_SCORE;
}

/** Builds the pairwise deltas used by comparison drawers and accessible tables. */
export function compareCandidates(
  left: ScoredCandidate,
  right: ScoredCandidate,
): CandidateComparison {
  const metricDeltas = {} as Record<WeightKey, number>;
  const metricWinnerIds = {} as Record<WeightKey, string | null>;

  for (const key of WEIGHT_KEYS) {
    const delta = comparableScore(left.metricScores[key]) - comparableScore(right.metricScores[key]);
    metricDeltas[key] = delta;
    metricWinnerIds[key] =
      Math.abs(delta) <= COMPARISON_EPSILON ? null : delta > 0 ? left.id : right.id;
  }

  return {
    leftId: left.id,
    rightId: right.id,
    winnerId: compareScoredCandidates(left, right) <= 0 ? left.id : right.id,
    scoreDelta: comparableScore(left.score) - comparableScore(right.score),
    metricDeltas,
    metricWinnerIds,
  };
}

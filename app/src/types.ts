export const WEIGHT_KEYS = ["transit", "daily", "health", "safety", "budget"] as const;

export type WeightKey = (typeof WEIGHT_KEYS)[number];

export type ContractType = "전세" | "월세";

export type PropertyType = "오피스텔" | "연립다세대";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface DataConfidence {
  readonly level: ConfidenceLevel;
  /** A qualitative aid from 0 to 1, not a statistical probability. */
  readonly score: number;
  readonly explanation: string;
}

export interface DataProvenance {
  /** Date through which the frozen source snapshot should be interpreted. */
  readonly asOf: string;
  readonly source: string;
  readonly license: string;
  readonly confidence: DataConfidence;
}

export interface NeighborhoodCounts {
  readonly safe: number;
  readonly police: number;
  readonly public: number;
  readonly health: number;
  readonly convenience: number;
  readonly accident: number;
  readonly disaster: number;
  readonly traffic: number;
  readonly unhealth: number;
  readonly subway: number;
  readonly bus: number;
}

export interface Candidate extends DataProvenance {
  readonly id: string;
  readonly name: string;
  readonly district: string;
  readonly dong: string;
  readonly address: string;
  readonly propertyType: PropertyType;
  readonly contractType: ContractType;
  /** Deposit in 만원. */
  readonly deposit: number;
  /** Monthly rent in 만원. Jeonse records use 0. */
  readonly monthlyRent: number;
  /** Construction year; used as the recency tie-breaker. */
  readonly year: number;
  readonly transactionDate: string;
  readonly areaSqm: number;
  readonly floor: number;
  readonly latitude: number;
  readonly longitude: number;
  /** Counts inside the frozen 1 km analysis radius. */
  readonly nearby: NeighborhoodCounts;
}

/** Formula outputs before conversion to cohort-relative percentiles. */
export interface RawScoreMetrics {
  readonly transit: number;
  readonly daily: number;
  readonly health: number;
  readonly safety: number;
  readonly budgetCost: number;
  /** Risk is exposed as evidence but is not an independently weighted dimension. */
  readonly risk: number;
}

export type MetricScores = Readonly<Record<WeightKey, number>>;

export type ScoreWeights = Readonly<Record<WeightKey, number>>;

export interface ScoringOptions {
  /** User-selected annual opportunity-cost rate used to convert deposits to a monthly cost. */
  readonly depositAnnualRatePercent: number;
}

export interface ScoredCandidate extends Candidate {
  /** Weighted suitability score in the 0–100 range. */
  readonly score: number;
  /** Tie-aware cohort percentile for each UI weight dimension. */
  readonly metricScores: MetricScores;
  readonly rawMetrics: RawScoreMetrics;
  readonly rank: number;
}

export interface CandidateFilters {
  readonly search?: string;
  readonly dong?: string;
  readonly contractType?: ContractType | "전체";
  /** Inclusive upper bound in 만원. */
  readonly maxDeposit?: number;
  /** Inclusive upper bound in 만원. */
  readonly maxRent?: number;
}

export type PercentileDirection = "higher" | "lower";

export interface CandidateComparison {
  readonly leftId: string;
  readonly rightId: string;
  /** Winner after score, cost, year, and id tie-breakers. */
  readonly winnerId: string;
  readonly scoreDelta: number;
  readonly metricDeltas: MetricScores;
  readonly metricWinnerIds: Readonly<Record<WeightKey, string | null>>;
}

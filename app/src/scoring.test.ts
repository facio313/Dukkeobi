import { describe, expect, it } from "vitest";

import {
  CANDIDATES,
  CANDIDATE_DATASET_METADATA,
  CANDIDATE_SOURCE_AUDIT,
  DEFAULT_SCORING_OPTIONS,
  DEFAULT_WEIGHTS,
  SCORE_DIMENSIONS,
} from "./data";
import {
  calculateWeightedScore,
  compareCandidates,
  compareScoredCandidates,
  deriveRawMetrics,
  filterCandidates,
  normalizeWeights,
  scoreCandidates,
  tieAwarePercentiles,
} from "./scoring";
import type { Candidate, MetricScores, ScoredCandidate } from "./types";

function candidateById(id: string): Candidate {
  const candidate = CANDIDATES.find((item) => item.id === id);
  if (candidate === undefined) throw new Error(`Missing test candidate: ${id}`);
  return candidate;
}

function scoredById(candidates: readonly ScoredCandidate[], id: string): ScoredCandidate {
  const candidate = candidates.find((item) => item.id === id);
  if (candidate === undefined) throw new Error(`Missing scored candidate: ${id}`);
  return candidate;
}

describe("frozen candidate data", () => {
  it("contains the eight verified 2022 transactions and their provenance", () => {
    expect(CANDIDATES).toHaveLength(8);
    expect(new Set(CANDIDATES.map((candidate) => candidate.id)).size).toBe(8);

    for (const candidate of CANDIDATES) {
      expect(candidate.transactionDate).toMatch(/^2022-/);
      expect(candidate.asOf).toBe("2022-12-31");
      expect(candidate.source.length).toBeGreaterThan(20);
      expect(candidate.license.length).toBeGreaterThan(20);
      expect(candidate.confidence.explanation.length).toBeGreaterThan(20);
      expect(candidate.confidence.score).toBeGreaterThanOrEqual(0);
      expect(candidate.confidence.score).toBeLessThanOrEqual(1);
    }

    expect(CANDIDATE_DATASET_METADATA.confidence.level).toBe("medium");
    expect(CANDIDATE_SOURCE_AUDIT.revision).toMatch(/^[0-9a-f]{40}$/);
    expect(Object.values(CANDIDATE_SOURCE_AUDIT.gitBlobs)).toHaveLength(5);
    expect(Object.values(CANDIDATE_SOURCE_AUDIT.gitBlobs).every((blob) => /^[0-9a-f]{40}$/.test(blob))).toBe(true);
    expect(SCORE_DIMENSIONS.budget.formula).toContain("deposit");
    expect(DEFAULT_SCORING_OPTIONS.depositAnnualRatePercent).toBe(4);
    expect(DEFAULT_WEIGHTS).toEqual({
      transit: 20,
      daily: 20,
      health: 20,
      safety: 20,
      budget: 20,
    });
  });

  it("keeps exact coordinates and amounts for representative rows", () => {
    const dk = candidateById("dk-building");
    expect(dk).toMatchObject({
      dong: "공덕동",
      contractType: "월세",
      deposit: 1_000,
      monthlyRent: 87,
      longitude: 126.960765408375,
      latitude: 37.5498189684252,
    });

    const dmc = candidateById("dmc-iaan-sangam-2");
    expect(dmc).toMatchObject({
      dong: "상암동",
      contractType: "전세",
      deposit: 55_000,
      monthlyRent: 0,
      year: 2007,
    });
  });
});

describe("raw metric formulas", () => {
  it("applies every documented formula exactly", () => {
    const metrics = deriveRawMetrics(candidateById("dk-building"));
    expect(metrics).toMatchObject({
      transit: 115,
      daily: 44,
      health: 165,
      risk: 13,
      safety: 24,
    });
    expect(metrics.budgetCost).toBeCloseTo(90.333333, 6);
  });

  it("uses an explicit annual deposit rate instead of a hidden fixed conversion", () => {
    const candidate = candidateById("dk-building");
    expect(deriveRawMetrics(candidate, { depositAnnualRatePercent: 0 }).budgetCost).toBe(87);
    expect(deriveRawMetrics(candidate, { depositAnnualRatePercent: 12 }).budgetCost).toBe(97);
    expect(deriveRawMetrics(candidate, { depositAnnualRatePercent: Number.NaN }).budgetCost).toBeCloseTo(90.333333, 6);
  });

  it("allows a negative safety result instead of truncating evidence", () => {
    const base = candidateById("dk-building");
    const risky: Candidate = {
      ...base,
      id: "risky",
      nearby: { ...base.nearby, safe: 0, police: 0, accident: 10 },
    };
    expect(deriveRawMetrics(risky).safety).toBe(-58);
  });

  it("keeps invalid inputs unknown so scoring can assign neutral percentiles", () => {
    const base = candidateById("dk-building");
    const invalid: Candidate = {
      ...base,
      id: "invalid",
      deposit: Number.NaN,
      nearby: { ...base.nearby, subway: Number.NaN },
    };
    const metrics = deriveRawMetrics(invalid);
    expect(metrics.transit).toBeNaN();
    expect(metrics.budgetCost).toBeNaN();
    expect(metrics.daily).toBe(44);
  });
});

describe("tie-aware percentile", () => {
  it("uses average ranks for ties and reaches both endpoints", () => {
    expect(tieAwarePercentiles([10, 20, 20, 40])).toEqual([0, 50, 50, 100]);
    expect(tieAwarePercentiles([10, 20, 20, 40], "lower")).toEqual([100, 50, 50, 0]);
  });

  it("returns neutral values when the cohort has no variation", () => {
    expect(tieAwarePercentiles([7, 7, 7])).toEqual([50, 50, 50]);
    expect(tieAwarePercentiles([7])).toEqual([50]);
    expect(tieAwarePercentiles([])).toEqual([]);
  });

  it("assigns neutral to NaN and infinities without poisoning valid ranks", () => {
    expect(tieAwarePercentiles([1, Number.NaN, 3, Number.POSITIVE_INFINITY])).toEqual([
      0,
      50,
      100,
      50,
    ]);
    expect(tieAwarePercentiles([Number.NaN, Number.NEGATIVE_INFINITY])).toEqual([50, 50]);
  });
});

describe("weights and cohort scoring", () => {
  it("normalizes custom weights and restores defaults for an unusable set", () => {
    expect(
      normalizeWeights({ transit: 1, daily: 1, health: 0, safety: 0, budget: 0 }),
    ).toEqual({ transit: 50, daily: 50, health: 0, safety: 0, budget: 0 });
    expect(
      normalizeWeights({
        transit: Number.NaN,
        daily: -10,
        health: 0,
        safety: 0,
        budget: 0,
      }),
    ).toEqual(DEFAULT_WEIGHTS);
  });

  it("keeps the weighted result bounded and treats an invalid metric as neutral", () => {
    const metrics: MetricScores = {
      transit: Number.NaN,
      daily: 200,
      health: -100,
      safety: 50,
      budget: 50,
    };
    expect(calculateWeightedScore(metrics)).toBe(50);
  });

  it("scores the complete cohort, including a real transit tie", () => {
    const scored = scoreCandidates(CANDIDATES);
    expect(scored).toHaveLength(8);
    expect(scored.map((candidate) => candidate.id)).toEqual([
      "gongdeok-city-house",
      "mangwon-338-34",
      "yd-residence",
      "dk-building",
      "kcc-empire-river",
      "savoy-city-dmc",
      "yeonnam-223-117",
      "dmc-iaan-sangam-2",
    ]);
    expect(scored.map((candidate) => candidate.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);

    const dk = scoredById(scored, "dk-building");
    const dmc = scoredById(scored, "dmc-iaan-sangam-2");
    expect(dk.rawMetrics.transit).toBe(115);
    expect(dmc.rawMetrics.transit).toBe(115);
    expect(dk.metricScores.transit).toBeCloseTo(64.285714, 5);
    expect(dmc.metricScores.transit).toBe(dk.metricScores.transit);
    expect(scored[0]?.score).toBeCloseTo(77.142857, 6);
  });

  it("inverts only budget cost and can rank on budget alone", () => {
    const scored = scoreCandidates(CANDIDATES, {
      transit: 0,
      daily: 0,
      health: 0,
      safety: 0,
      budget: 100,
    });
    expect(scored.map((candidate) => candidate.id)).toEqual([
      "yd-residence",
      "gongdeok-city-house",
      "savoy-city-dmc",
      "mangwon-338-34",
      "yeonnam-223-117",
      "dk-building",
      "kcc-empire-river",
      "dmc-iaan-sangam-2",
    ]);
    expect(scored[0]?.metricScores.budget).toBe(100);
    expect(scored.at(-1)?.metricScores.budget).toBe(0);
  });

  it("does not mutate input and handles an empty cohort", () => {
    const before = JSON.stringify(CANDIDATES);
    expect(scoreCandidates([])).toEqual([]);
    scoreCandidates(CANDIDATES);
    expect(JSON.stringify(CANDIDATES)).toBe(before);
  });

  it("keeps scores finite when one record contains NaN", () => {
    const first = candidateById("dk-building");
    const broken: Candidate = {
      ...first,
      id: "broken",
      nearby: { ...first.nearby, health: Number.NaN },
    };
    const cohort = [broken, candidateById("yd-residence"), candidateById("mangwon-338-34")];
    const scored = scoreCandidates(cohort);
    const brokenScore = scoredById(scored, "broken");
    expect(brokenScore.metricScores.health).toBe(50);
    expect(Number.isFinite(brokenScore.score)).toBe(true);
  });
});

describe("filtering", () => {
  it("searches names and addresses with case and whitespace normalization", () => {
    expect(filterCandidates(CANDIDATES, { search: "  dmc 이안 " }).map(({ id }) => id)).toEqual([
      "dmc-iaan-sangam-2",
    ]);
    expect(filterCandidates(CANDIDATES, { search: "동교로51길" }).map(({ id }) => id)).toEqual([
      "yeonnam-223-117",
    ]);
    expect(filterCandidates(CANDIDATES, { search: "없는 후보" })).toEqual([]);
  });

  it("filters by dong and contract type and accepts the 전체 sentinel", () => {
    expect(filterCandidates(CANDIDATES, { dong: "공 덕동" })).toHaveLength(3);
    expect(filterCandidates(CANDIDATES, { contractType: "전세" }).map(({ id }) => id)).toEqual([
      "yd-residence",
      "dmc-iaan-sangam-2",
      "kcc-empire-river",
    ]);
    expect(filterCandidates(CANDIDATES, { dong: "전체", contractType: "전체" })).toHaveLength(8);
    expect(filterCandidates(CANDIDATES, { dong: "상암동", contractType: "월세" }).map(({ id }) => id)).toEqual([
      "savoy-city-dmc",
    ]);
  });

  it("uses inclusive deposit and rent boundaries", () => {
    expect(
      filterCandidates(CANDIDATES, { maxDeposit: 1_000, maxRent: 63 }).map(({ id }) => id),
    ).toEqual(["gongdeok-city-house", "savoy-city-dmc"]);
    expect(filterCandidates(CANDIDATES, { maxRent: 0 })).toHaveLength(3);
    expect(filterCandidates(CANDIDATES, { maxDeposit: -1 })).toEqual([]);
  });

  it("ignores NaN bounds instead of hiding every result", () => {
    expect(
      filterCandidates(CANDIDATES, { maxDeposit: Number.NaN, maxRent: Number.NaN }),
    ).toHaveLength(8);
  });
});

describe("comparison utilities", () => {
  it("breaks score ties by lower cost, newer year, then id", () => {
    const base = scoreCandidates([candidateById("dk-building")])[0];
    if (base === undefined) throw new Error("Missing comparator fixture");

    const makeTie = (id: string, budgetCost: number, year: number): ScoredCandidate => ({
      ...base,
      id,
      year,
      score: 70,
      rawMetrics: { ...base.rawMetrics, budgetCost },
    });
    const candidates = [
      makeTie("z", 100, 2025),
      makeTie("b", 80, 2010),
      makeTie("a", 80, 2010),
      makeTie("new", 80, 2024),
    ];

    expect(candidates.sort(compareScoredCandidates).map(({ id }) => id)).toEqual([
      "new",
      "a",
      "b",
      "z",
    ]);
  });

  it("returns pairwise score and metric winners", () => {
    const scored = scoreCandidates(CANDIDATES);
    const left = scoredById(scored, "gongdeok-city-house");
    const right = scoredById(scored, "dmc-iaan-sangam-2");
    const comparison = compareCandidates(left, right);

    expect(comparison.winnerId).toBe(left.id);
    expect(comparison.scoreDelta).toBeGreaterThan(0);
    expect(comparison.metricWinnerIds.transit).toBe(left.id);
    expect(comparison.metricWinnerIds.safety).toBe(left.id);
    expect(comparison.metricWinnerIds.budget).toBe(left.id);
  });
});

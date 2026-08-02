import type { CategorySlug } from "./types";

const CATEGORY_BASE: Record<CategorySlug, number> = {
  "health-medicine": 82,
  "science-discovery": 78,
  education: 74,
  environment: 80,
  wildlife: 76,
  humanitarian: 84,
  community: 70,
  "clean-energy": 79,
  "technology-for-good": 75,
  accessibility: 77,
  peace: 83,
  culture: 68,
  "inspiring-people": 72,
  "economy-for-good": 71,
};

export function scoreImpact(category: CategorySlug, title: string, summary: string): number {
  const text = `${title} ${summary}`.toLowerCase();
  let score = CATEGORY_BASE[category];

  if (/(breakthrough|first|record|restored|saved|cured|free)/.test(text)) score += 6;
  if (/(global|nationwide|million|community-wide)/.test(text)) score += 4;
  if (/(study|trial|peer-reviewed|university)/.test(text)) score += 3;

  return Math.max(40, Math.min(98, Math.round(score)));
}

export function scoreCredibility(sourceReliability: number, hasUrl: boolean): number {
  let score = sourceReliability * 100;
  if (hasUrl) score += 4;
  return Math.max(35, Math.min(97, Math.round(score)));
}

export function buildExplainability(params: {
  impactScore: number;
  credibilityScore: number;
  categoryName: string;
  sourceName: string;
}): string {
  return `Selected because it shows meaningful progress in ${params.categoryName.toLowerCase()}, with an impact score of ${params.impactScore}/100, credibility score of ${params.credibilityScore}/100, and a trusted source (${params.sourceName}). Editorial publication still requires human approval.`;
}

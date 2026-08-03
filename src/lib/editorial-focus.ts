/**
 * Editorial focus for Dopa News collection and filtering.
 * Prefer very recent human stories from newspapers and the open web.
 */

export type EditorialThemeId =
  | "personal-triumph"
  | "health-wins"
  | "happy-endings"
  | "happy-family"
  | "new-energy";

export interface EditorialTheme {
  id: EditorialThemeId;
  label: string;
  /** Short hint shown in the admin desk */
  description: string;
  /** Google News / web search clause — keep relatively short for reliable feeds */
  query: string;
}

/** Prefer stories from the last week; drop anything older than this. */
export const MAX_STORY_AGE_DAYS = 14;
export const GOOGLE_NEWS_RECENCY = "when:7d";

export const EDITORIAL_THEMES: EditorialTheme[] = [
  {
    id: "personal-triumph",
    label: "Personal triumph",
    description: "People overcoming adversity and rebuilding their lives",
    query: 'overcame OR "against all odds" OR "comeback story" OR "second chance" OR "turned his life" OR "turned her life"',
  },
  {
    id: "health-wins",
    label: "Health wins",
    description: "Winning against illness, recovery, and medical hope",
    query: '"cancer free" OR "in remission" OR "miracle recovery" OR "patient recovers" OR "beats cancer"',
  },
  {
    id: "happy-endings",
    label: "Happy endings",
    description: "Stories that resolve with hope, reunion, or rescue",
    query: '"happy ending" OR "family reunited" OR "found safe" OR heartwarming OR "good news story"',
  },
  {
    id: "happy-family",
    label: "Happy family",
    description: "Warm family moments, adoptions, reunions, and care",
    query: '"family reunion" OR "siblings reunited" OR "heartwarming family" OR "parents celebrate" OR "adopted"',
  },
  {
    id: "new-energy",
    label: "New energy",
    description: "Clean and renewable energy progress people can feel",
    query: '"renewable energy" OR "clean energy" OR "solar power" OR "wind power" OR "green energy"',
  },
];

/**
 * Compact default used when the subject field is blank.
 * Kept shorter than OR-ing every theme clause so Google News RSS stays reliable.
 */
export const DEFAULT_WEB_SEARCH_TOPIC =
  'heartwarming OR "happy ending" OR "family reunion" OR "cancer free" OR overcame OR "clean energy" OR "solar power" OR "good news story"';

export const POSITIVE_NEWS_TERMS = `(${DEFAULT_WEB_SEARCH_TOPIC})`;

export function themeById(id: EditorialThemeId): EditorialTheme | undefined {
  return EDITORIAL_THEMES.find((theme) => theme.id === id);
}

export function isRecentEnough(
  isoDate: string | undefined,
  maxAgeDays = MAX_STORY_AGE_DAYS,
): boolean {
  if (!isoDate) return true;
  const published = Date.parse(isoDate);
  if (Number.isNaN(published)) return true;
  const ageMs = Date.now() - published;
  return ageMs <= maxAgeDays * 24 * 60 * 60 * 1000;
}

/** Extract meaningful match terms; prefer quoted phrases; drop tiny/stop words. */
export function meaningfulQueryTerms(query: string): string[] {
  const phrases = [...query.matchAll(/"([^"]+)"/g)].map((match) =>
    match[1].toLowerCase().trim(),
  );
  const withoutQuotes = query.replace(/"[^"]+"/g, " ");
  const stop = new Set([
    "the",
    "and",
    "or",
    "for",
    "with",
    "from",
    "that",
    "this",
    "into",
    "have",
    "has",
    "are",
    "was",
    "were",
    "will",
    "a",
    "an",
    "of",
    "in",
    "on",
    "to",
    "by",
    "free",
    "new",
    "all",
    "out",
    "not",
  ]);
  const words = withoutQuotes
    .toLowerCase()
    .split(/[\s,()]+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 3 && !stop.has(term));

  return [...new Set([...phrases, ...words])];
}

export function matchesEditorialTopic(title: string, summary: string, query: string): boolean {
  const terms = meaningfulQueryTerms(query);
  if (terms.length === 0) return true;
  const haystack = `${title} ${summary}`.toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

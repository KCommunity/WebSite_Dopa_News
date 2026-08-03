import type { CategorySlug } from "./types";
import { TAXONOMY } from "./taxonomy";

/** Signals aligned with Dopa editorial lines: triumph, health wins, happy endings, family, new energy. */
const POSITIVE_SIGNALS =
  /(overcame|triumph|comeback|second chance|beats? the odds|against all odds|cancer.?free|in remission|recover|recovery|miracle recovery|happy ending|reunited|rescued|heartwarming|adoption|family reunion|new baby|parents celebrate|renewable|clean energy|solar power|wind power|green energy|hope|saved|cure|cured|healed)/i;

const NEGATIVE_FILTERS =
  /(scandal|war crime|murder|crash kills|stock plunge|celebrity divorce|clickbait|shocking|massacre|terror attack|horoscope|astrology)/i;

export function looksLikeGoodNews(title: string, summary: string): boolean {
  const text = `${title} ${summary}`;
  if (NEGATIVE_FILTERS.test(text)) return false;
  return POSITIVE_SIGNALS.test(text) || text.length > 40;
}

/** Soft filter for web search — keep hopeful human stories; reject clear harm/crime. */
export function looksLikeWebSearchCandidate(title: string, summary: string): boolean {
  const text = `${title} ${summary}`;
  if (
    /(murder|war crime|massacre|terror attack|stock plunge|celebrity divorce|clickbait|gore|killed in|dies after|fatal|horoscope|astrology)/i.test(
      text,
    )
  ) {
    return false;
  }
  if (POSITIVE_SIGNALS.test(text)) return true;
  if (
    /(good news|positive|uplifting|inspiring|helps|helping|award|donation|volunteer|opens|opened|protects|protected|breakthrough|innovation|community|kindness)/i.test(
      text,
    )
  ) {
    return true;
  }
  return text.trim().length > 35;
}

export function classifyArticle(title: string, summary: string): CategorySlug {
  const text = `${title} ${summary}`.toLowerCase();
  let best: CategorySlug = "community";
  let bestScore = 0;

  for (const category of TAXONOMY) {
    const terms = [...category.keywords, ...category.synonyms, category.name.toLowerCase()];
    const score = terms.reduce((total, term) => {
      return total + (text.includes(term.toLowerCase()) ? 2 : 0);
    }, 0);

    if (score > bestScore) {
      bestScore = score;
      best = category.slug;
    }
  }

  return best;
}

export function extractKeywords(title: string, summary: string): string[] {
  const stop = new Set([
    "the",
    "and",
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
  ]);

  const words = `${title} ${summary}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stop.has(word));

  return [...new Set(words)].slice(0, 8);
}

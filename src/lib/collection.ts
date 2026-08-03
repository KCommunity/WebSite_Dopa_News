import Parser from "rss-parser";
import { nanoid } from "nanoid";
import {
  classifyArticle,
  extractKeywords,
  looksLikeGoodNews,
  looksLikeWebSearchCandidate,
} from "./classify";
import { buildExplainability, scoreCredibility, scoreImpact } from "./scoring";
import { slugify } from "./slugify";
import {
  applyPrimarySource,
  createArticleSource,
  getArticleSources,
} from "./sources";
import {
  DEFAULT_WEB_SEARCH_TOPIC,
  EDITORIAL_THEMES,
  isRecentEnough,
  matchesEditorialTopic,
} from "./editorial-focus";
import {
  FOCUS_REGIONS,
  buildRegionalSearchQuery,
  type FocusRegionId,
} from "./regions";
import { getCategoryName } from "./taxonomy";
import type { Article, ArticleSource, Source } from "./types";
import { readStore, upsertArticles } from "./store";

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "DopaNews/0.1 (+https://dopa.news)",
  },
});

export const DEFAULT_SOURCES: Source[] = [
  {
    id: "src-goodnewsnetwork",
    name: "Good News Network",
    url: "https://www.goodnewsnetwork.org",
    feedUrl: "https://www.goodnewsnetwork.org/feed/",
    reliability: 0.86,
    notes: "Dedicated positive news outlet",
    enabled: true,
    channel: "rss",
  },
  {
    id: "src-positive-news",
    name: "Positive News",
    url: "https://www.positive.news",
    feedUrl: "https://www.positive.news/feed/",
    reliability: 0.84,
    notes: "Constructive journalism",
    enabled: true,
    channel: "rss",
  },
  {
    id: "src-reasons-to-be-cheerful",
    name: "Reasons to be Cheerful",
    url: "https://reasonstobecheerful.world",
    feedUrl: "https://reasonstobecheerful.world/feed/",
    reliability: 0.85,
    notes: "Solutions journalism",
    enabled: true,
    channel: "rss",
  },
];

type FeedItem = {
  title?: string;
  link?: string;
  contentSnippet?: string;
  summary?: string;
  content?: string;
  isoDate?: string;
  creator?: string;
  source?: string | { title?: string; url?: string };
};

function summarize(text: string, max = 280): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

function splitTitleAndPublisher(rawTitle: string): { title: string; publisher?: string } {
  const parts = rawTitle.split(/\s+[-–—]\s+/);
  if (parts.length < 2) return { title: rawTitle.trim() };
  const publisher = parts.pop()?.trim();
  return {
    title: parts.join(" - ").trim(),
    publisher: publisher || undefined,
  };
}

function buildArticle(params: {
  title: string;
  summary: string;
  sources: ArticleSource[];
  collectedAt: string;
  discoveryMethod: Article["discoveryMethod"];
  searchQuery?: string;
  sourceReliability?: number;
  country?: string;
}): Article {
  const category = classifyArticle(params.title, params.summary);
  const impactScore = scoreImpact(category, params.title, params.summary);
  const credibilityScore = scoreCredibility(
    params.sourceReliability ?? 0.7,
    true,
    params.sources.length,
  );
  const now = new Date().toISOString();
  const sourceNames = params.sources.map((source) => source.name).join(", ");

  return applyPrimarySource(
    {
      id: nanoid(),
      slug: `${slugify(params.title)}-${nanoid(6)}`,
      title: params.title,
      summary: params.summary,
      body: params.summary,
      category,
      status: "pending_validation",
      sourceId: "",
      sourceName: "",
      sourceUrl: "",
      sources: params.sources,
      originalLanguage: "en",
      country: params.country,
      keywords: extractKeywords(params.title, params.summary),
      impactScore,
      credibilityScore,
      explainability: buildExplainability({
        impactScore,
        credibilityScore,
        categoryName: getCategoryName(category),
        sourceName: sourceNames,
        sourceCount: params.sources.length,
      }),
      collectedAt: params.collectedAt || now,
      processedAt: now,
      discoveryMethod: params.discoveryMethod,
      searchQuery: params.searchQuery,
    },
    params.sources,
  );
}

export async function collectFromSources(sources: Source[] = DEFAULT_SOURCES): Promise<{
  fetched: number;
  accepted: number;
  added: number;
  merged: number;
  articles: Article[];
}> {
  let fetched = 0;
  let accepted = 0;
  const candidates: Article[] = [];

  for (const source of sources) {
    if (source.enabled === false) continue;
    if (!source.feedUrl) continue;

    try {
      const feed = await parser.parseURL(source.feedUrl);
      for (const item of feed.items.slice(0, 12) as FeedItem[]) {
        fetched += 1;
        const title = item.title?.trim();
        const link = item.link?.trim();
        if (!title || !link) continue;

        const rawSummary = item.contentSnippet || item.summary || item.content || title;
        const summary = summarize(String(rawSummary));
        if (!looksLikeGoodNews(title, summary)) continue;

        candidates.push(
          buildArticle({
            title,
            summary,
            sources: [
              createArticleSource({
                id: source.id,
                name: source.name,
                url: link,
                reliability: source.reliability,
              }),
            ],
            collectedAt: item.isoDate || new Date().toISOString(),
            discoveryMethod: "rss",
            sourceReliability: source.reliability,
          }),
        );
        accepted += 1;
      }
    } catch (error) {
      console.error(`Failed to collect from ${source.name}:`, error);
    }
  }

  const result = await upsertArticles(candidates);
  return {
    fetched,
    accepted,
    added: result.added,
    merged: result.merged,
    articles: result.articles,
  };
}

async function fetchGoogleNewsFeed(
  searchQuery: string,
  locale: { hl: string; gl: string; ceid: string },
): Promise<FeedItem[]> {
  const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=${locale.hl}&gl=${locale.gl}&ceid=${encodeURIComponent(locale.ceid)}`;
  const feed = await parser.parseURL(feedUrl);
  return (feed.items ?? []) as FeedItem[];
}

function articleFromFeedItem(
  item: FeedItem,
  searchQuery: string,
  regionLabel?: string,
): Article | null {
  const rawTitle = item.title?.trim();
  const link = item.link?.trim();
  if (!rawTitle || !link) return null;

  const { title, publisher } = splitTitleAndPublisher(rawTitle);
  const rawSummary = item.contentSnippet || item.summary || item.content || title;
  const summary = summarize(String(rawSummary));
  if (!isRecentEnough(item.isoDate)) return null;
  if (!looksLikeWebSearchCandidate(title, summary)) return null;

  const sourceName =
    (typeof item.source === "object" && item.source?.title) ||
    publisher ||
    (typeof item.source === "string" ? item.source : undefined) ||
    item.creator ||
    "Web search result";

  const sourceUrl =
    (typeof item.source === "object" && item.source?.url) || link;

  return buildArticle({
    title,
    summary,
    sources: [
      createArticleSource({
        id: "src-web-search",
        name: sourceName,
        url: sourceUrl,
        reliability: 0.68,
      }),
    ],
    collectedAt: item.isoDate || new Date().toISOString(),
    discoveryMethod: "web_search",
    searchQuery,
    sourceReliability: 0.68,
    country: regionLabel,
  });
}

async function collectFromTrustedRss(
  query: string,
  maxResults: number,
): Promise<Article[]> {
  const store = await readStore();
  const sources = (store.sources.length ? store.sources : DEFAULT_SOURCES).filter(
    (source) => source.enabled !== false && source.feedUrl,
  );

  const candidates: Article[] = [];

  await Promise.all(
    sources.map(async (source) => {
      try {
        const feed = await parser.parseURL(source.feedUrl!);
        for (const item of (feed.items ?? []).slice(0, 25) as FeedItem[]) {
          const title = item.title?.trim();
          const link = item.link?.trim();
          if (!title || !link) continue;
          const rawSummary = item.contentSnippet || item.summary || item.content || title;
          const summary = summarize(String(rawSummary));
          if (!isRecentEnough(item.isoDate)) continue;
          if (!looksLikeGoodNews(title, summary) && !looksLikeWebSearchCandidate(title, summary)) {
            continue;
          }
          // Topic filter is strict for RSS fallback so subject search stays relevant.
          if (!matchesEditorialTopic(title, summary, query)) continue;

          candidates.push(
            buildArticle({
              title,
              summary,
              sources: [
                createArticleSource({
                  id: source.id,
                  name: source.name,
                  url: link,
                  reliability: source.reliability,
                }),
              ],
              collectedAt: item.isoDate || new Date().toISOString(),
              discoveryMethod: "web_search",
              searchQuery: query,
              sourceReliability: source.reliability,
            }),
          );
        }
      } catch (error) {
        console.error(`Trusted RSS search failed for ${source.name}:`, error);
      }
    }),
  );

  return candidates.slice(0, maxResults * 3);
}

function dedupeCandidates(articles: Article[]): Article[] {
  const seen = new Set<string>();
  const unique: Article[] = [];
  for (const article of articles) {
    const key = article.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(article);
  }
  return unique;
}

/**
 * Internet search: Google News by selected regions first, trusted RSS as fallback.
 */
export async function collectFromWebSearch(
  query: string,
  regionIds?: FocusRegionId[],
  maxResults = 5,
): Promise<{
  fetched: number;
  accepted: number;
  added: number;
  merged: number;
  query: string;
  regions: string[];
  maxResults: number;
  channel: "google_news" | "trusted_rss" | "mixed";
  articles: Article[];
}> {
  const cleaned = query.trim() || DEFAULT_WEB_SEARCH_TOPIC;
  const limit = Math.max(1, Math.min(25, Math.round(maxResults)));
  const selectedRegions = FOCUS_REGIONS.filter((region) =>
    regionIds?.length ? regionIds.includes(region.id) : true,
  );

  let fetched = 0;
  let googleCandidates: Article[] = [];
  let rssCandidates: Article[] = [];

  // Blank / default search sweeps each editorial theme; custom subjects use the typed query.
  const themeSweep =
    !query.trim() || cleaned === DEFAULT_WEB_SEARCH_TOPIC;
  const topicQueries = themeSweep
    ? EDITORIAL_THEMES.map((theme) => theme.query)
    : [cleaned];
  const regionSlice = themeSweep
    ? selectedRegions.slice(0, Math.min(3, selectedRegions.length))
    : selectedRegions;
  const perFetch = themeSweep ? 2 : Math.max(2, Math.ceil(limit / Math.max(1, regionSlice.length)) + 1);

  // 1) Google News (last 7 days) for selected regions × topics.
  const settled = await Promise.allSettled(
    topicQueries.flatMap((topic) =>
      regionSlice.map(async (region) => {
        const searchQuery = buildRegionalSearchQuery(region, topic);
        const items = await fetchGoogleNewsFeed(searchQuery, region.locales[0]);
        return items.slice(0, perFetch).map((item) =>
          articleFromFeedItem(item, topic, region.label),
        );
      }),
    ),
  );

  for (const result of settled) {
    if (result.status !== "fulfilled") {
      console.error("Google News region fetch failed:", result.reason);
      continue;
    }
    for (const article of result.value) {
      if (!article) continue;
      googleCandidates.push(article);
      fetched += 1;
    }
  }

  // Prefer newest first.
  googleCandidates.sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));
  let candidates = dedupeCandidates(googleCandidates).slice(0, limit);

  // 2) Fill gaps from trusted RSS (topic-matched), still tagged with search query.
  if (candidates.length < limit) {
    rssCandidates = await collectFromTrustedRss(cleaned, limit);
    rssCandidates.sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));
    fetched += rssCandidates.length;
    candidates = dedupeCandidates([...candidates, ...rssCandidates]).slice(0, limit);
  }

  if (candidates.length === 0) {
    throw new Error(
      "No candidate news found for that subject/region. Try a broader topic, fewer region filters, or Add news for review.",
    );
  }

  let added = 0;
  let merged = 0;
  let stored = candidates;

  try {
    const result = await upsertArticles(candidates);
    added = result.added;
    merged = result.merged;
    // Prefer persisted rows; if upsert skipped (already published), still surface new pending ones.
    const pendingTouched = result.articles.filter(
      (article) => article.status === "pending_validation",
    );
    stored = pendingTouched.length > 0 ? pendingTouched : candidates;
  } catch (error) {
    console.error("Persist after search failed; returning candidates anyway:", error);
    added = candidates.length;
    stored = candidates;
  }

  const channel =
    googleCandidates.length > 0 && rssCandidates.length > 0
      ? "mixed"
      : googleCandidates.length > 0
        ? "google_news"
        : "trusted_rss";

  return {
    fetched,
    accepted: candidates.length,
    added,
    merged,
    query: cleaned,
    regions: selectedRegions.map((region) => region.label),
    maxResults: limit,
    channel,
    articles: stored,
  };
}

export function ensureArticleSources(article: Article): Article {
  const sources = getArticleSources(article);
  return applyPrimarySource(article, sources);
}

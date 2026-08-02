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
  FOCUS_REGIONS,
  buildRegionalSearchQuery,
  type FocusRegionId,
} from "./regions";
import { getCategoryName } from "./taxonomy";
import type { Article, ArticleSource, Source } from "./types";
import { upsertArticles } from "./store";

const parser = new Parser({
  timeout: 15000,
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

  const article = applyPrimarySource(
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

  return article;
}

export async function collectFromSources(sources: Source[] = DEFAULT_SOURCES): Promise<{
  fetched: number;
  accepted: number;
  added: number;
  merged: number;
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

        const articleSources = [
          createArticleSource({
            id: source.id,
            name: source.name,
            url: link,
            reliability: source.reliability,
          }),
        ];

        candidates.push(
          buildArticle({
            title,
            summary,
            sources: articleSources,
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
  return { fetched, accepted, added: result.added, merged: result.merged };
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
  if (!looksLikeWebSearchCandidate(title, summary)) return null;

  const sourceName =
    (typeof item.source === "object" && item.source?.title) ||
    publisher ||
    (typeof item.source === "string" ? item.source : undefined) ||
    item.creator ||
    "Web search result";

  const sourceUrl =
    (typeof item.source === "object" && item.source?.url) || link;

  const article = buildArticle({
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
  });

  if (regionLabel) {
    article.country = article.country || regionLabel;
    article.keywords = [...new Set([...article.keywords, regionLabel.toLowerCase()])];
  }

  return article;
}

async function collectFromTrustedRssFallback(
  query: string,
  maxResults: number,
): Promise<Article[]> {
  const { readStore } = await import("./store");
  const store = await readStore();
  const sources = (store.sources.length ? store.sources : DEFAULT_SOURCES).filter(
    (source) => source.enabled !== false && source.feedUrl,
  );

  const terms = query
    .toLowerCase()
    .split(/\s+or\s+|[\s,]+/i)
    .map((term) => term.replace(/[()]/g, "").trim())
    .filter((term) => term.length > 2);

  const candidates: Article[] = [];

  for (const source of sources) {
    if (candidates.length >= maxResults) break;
    try {
      const feed = await parser.parseURL(source.feedUrl!);
      for (const item of (feed.items ?? []).slice(0, 20) as FeedItem[]) {
        if (candidates.length >= maxResults) break;
        const title = item.title?.trim();
        const link = item.link?.trim();
        if (!title || !link) continue;
        const rawSummary = item.contentSnippet || item.summary || item.content || title;
        const summary = summarize(String(rawSummary));
        const haystack = `${title} ${summary}`.toLowerCase();
        const matchesQuery =
          terms.length === 0 || terms.some((term) => haystack.includes(term));
        if (!matchesQuery || !looksLikeGoodNews(title, summary)) continue;

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
      console.error(`Trusted RSS fallback failed for ${source.name}:`, error);
    }
  }

  return candidates;
}

/**
 * Internet search via Google News RSS across focus regions.
 * Falls back to trusted RSS feeds when Google News is unavailable.
 * Results enter the editorial queue as pending_validation.
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
  channel: "google_news" | "trusted_rss_fallback";
}> {
  const cleaned = query.trim() || DEFAULT_WEB_SEARCH_TOPIC;
  const limit = Math.max(1, Math.min(25, Math.round(maxResults)));
  const selectedRegions = FOCUS_REGIONS.filter((region) =>
    regionIds?.length ? regionIds.includes(region.id) : true,
  );

  let fetched = 0;
  const candidates: Article[] = [];
  const errors: string[] = [];
  let channel: "google_news" | "trusted_rss_fallback" = "google_news";

  for (const region of selectedRegions) {
    if (candidates.length >= limit) break;
    const searchQuery = buildRegionalSearchQuery(region, cleaned);
    const locale = region.locales[0];
    const remaining = limit - candidates.length;

    try {
      const items = await fetchGoogleNewsFeed(searchQuery, locale);
      for (const item of items.slice(0, Math.max(remaining * 2, remaining))) {
        if (candidates.length >= limit) break;
        fetched += 1;
        const article = articleFromFeedItem(item, cleaned, region.label);
        if (!article) continue;
        candidates.push(article);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown error";
      console.error(`Web search failed for ${region.label}:`, error);
      errors.push(`${region.label}: ${message}`);
    }
  }

  if (candidates.length === 0) {
    channel = "trusted_rss_fallback";
    const fallback = await collectFromTrustedRssFallback(cleaned, limit);
    fetched += fallback.length;
    candidates.push(...fallback);
  }

  if (candidates.length === 0 && errors.length > 0) {
    throw new Error(
      `Internet search failed for all regions. ${errors.slice(0, 2).join(" | ")}`,
    );
  }

  if (candidates.length === 0) {
    throw new Error(
      "No candidate news found. Try another topic, or use Add news for review.",
    );
  }

  const limited = candidates.slice(0, limit);
  const result = await upsertArticles(limited);
  return {
    fetched,
    accepted: limited.length,
    added: result.added,
    merged: result.merged,
    query: cleaned,
    regions: selectedRegions.map((region) => region.label),
    maxResults: limit,
    channel,
  };
}

export function ensureArticleSources(article: Article): Article {
  const sources = getArticleSources(article);
  return applyPrimarySource(article, sources);
}

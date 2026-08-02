import Parser from "rss-parser";
import { nanoid } from "nanoid";
import { classifyArticle, extractKeywords, looksLikeGoodNews } from "./classify";
import { buildExplainability, scoreCredibility, scoreImpact } from "./scoring";
import { slugify } from "./slugify";
import {
  applyPrimarySource,
  createArticleSource,
  getArticleSources,
} from "./sources";
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
  },
  {
    id: "src-positive-news",
    name: "Positive News",
    url: "https://www.positive.news",
    feedUrl: "https://www.positive.news/feed/",
    reliability: 0.84,
    notes: "Constructive journalism",
  },
  {
    id: "src-reasons-to-be-cheerful",
    name: "Reasons to be Cheerful",
    url: "https://reasonstobecheerful.world",
    feedUrl: "https://reasonstobecheerful.world/feed/",
    reliability: 0.85,
    notes: "Solutions journalism",
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

/**
 * Internet search via Google News RSS (no API key required).
 * Results enter the editorial queue as pending_validation.
 */
export async function collectFromWebSearch(query: string): Promise<{
  fetched: number;
  accepted: number;
  added: number;
  merged: number;
  query: string;
}> {
  const cleaned = query.trim();
  if (!cleaned) {
    return { fetched: 0, accepted: 0, added: 0, merged: 0, query: cleaned };
  }

  const searchQuery = `${cleaned} (breakthrough OR restored OR progress OR vaccine OR renewable OR accessibility OR conservation OR humanitarian)`;
  const feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(searchQuery)}&hl=en-US&gl=US&ceid=US:en`;

  let fetched = 0;
  let accepted = 0;
  const candidates: Article[] = [];

  try {
    const feed = await parser.parseURL(feedUrl);
    for (const item of feed.items.slice(0, 15) as FeedItem[]) {
      fetched += 1;
      const rawTitle = item.title?.trim();
      const link = item.link?.trim();
      if (!rawTitle || !link) continue;

      const { title, publisher } = splitTitleAndPublisher(rawTitle);
      const rawSummary = item.contentSnippet || item.summary || item.content || title;
      const summary = summarize(String(rawSummary));
      if (!looksLikeGoodNews(title, summary)) continue;

      const sourceName =
        (typeof item.source === "object" && item.source?.title) ||
        publisher ||
        (typeof item.source === "string" ? item.source : undefined) ||
        item.creator ||
        "Web search result";

      const sourceUrl =
        (typeof item.source === "object" && item.source?.url) || link;

      candidates.push(
        buildArticle({
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
          searchQuery: cleaned,
          sourceReliability: 0.68,
        }),
      );
      accepted += 1;
    }
  } catch (error) {
    console.error("Web search collection failed:", error);
    throw error;
  }

  const result = await upsertArticles(candidates);
  return {
    fetched,
    accepted,
    added: result.added,
    merged: result.merged,
    query: cleaned,
  };
}

export function ensureArticleSources(article: Article): Article {
  const sources = getArticleSources(article);
  return applyPrimarySource(article, sources);
}

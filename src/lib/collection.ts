import Parser from "rss-parser";
import { nanoid } from "nanoid";
import { classifyArticle, extractKeywords, looksLikeGoodNews } from "./classify";
import { buildExplainability, scoreCredibility, scoreImpact } from "./scoring";
import { slugify } from "./slugify";
import { getCategoryName } from "./taxonomy";
import type { Article, Source } from "./types";
import { upsertArticles } from "./store";

const parser = new Parser({
  timeout: 12000,
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

function summarize(text: string, max = 280): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

export async function collectFromSources(sources: Source[] = DEFAULT_SOURCES): Promise<{
  fetched: number;
  accepted: number;
  added: number;
}> {
  let fetched = 0;
  let accepted = 0;
  const candidates: Article[] = [];

  for (const source of sources) {
    if (!source.feedUrl) continue;

    try {
      const feed = await parser.parseURL(source.feedUrl);
      for (const item of feed.items.slice(0, 12)) {
        fetched += 1;
        const title = item.title?.trim();
        const link = item.link?.trim();
        if (!title || !link) continue;

        const rawSummary = item.contentSnippet || item.summary || item.content || title;
        const summary = summarize(String(rawSummary));
        if (!looksLikeGoodNews(title, summary)) continue;

        const category = classifyArticle(title, summary);
        const impactScore = scoreImpact(category, title, summary);
        const credibilityScore = scoreCredibility(source.reliability, true);
        const now = new Date().toISOString();
        const baseSlug = slugify(title);
        const slug = `${baseSlug}-${nanoid(6)}`;

        candidates.push({
          id: nanoid(),
          slug,
          title,
          summary,
          body: summary,
          category,
          status: "pending_validation",
          sourceId: source.id,
          sourceName: source.name,
          sourceUrl: link,
          originalLanguage: "en",
          keywords: extractKeywords(title, summary),
          impactScore,
          credibilityScore,
          explainability: buildExplainability({
            impactScore,
            credibilityScore,
            categoryName: getCategoryName(category),
            sourceName: source.name,
          }),
          collectedAt: item.isoDate || now,
          processedAt: now,
          imageUrl: undefined,
        });
        accepted += 1;
      }
    } catch (error) {
      console.error(`Failed to collect from ${source.name}:`, error);
    }
  }

  const added = await upsertArticles(candidates);
  return { fetched, accepted, added };
}

import { promises as fs } from "fs";
import path from "path";
import {
  applyPrimarySource,
  getArticleSources,
  mergeArticleSources,
} from "./sources";
import type { Article, EditorialStatus, StoreData } from "./types";

const DATA_PATH = path.join(process.cwd(), "data", "store.json");

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 96);
}

async function ensureStore(): Promise<StoreData> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return JSON.parse(raw) as StoreData;
  } catch {
    const empty: StoreData = {
      version: 1,
      updatedAt: new Date().toISOString(),
      sources: [],
      articles: [],
    };
    await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
    await fs.writeFile(DATA_PATH, JSON.stringify(empty, null, 2), "utf8");
    return empty;
  }
}

async function persist(data: StoreData): Promise<void> {
  data.updatedAt = new Date().toISOString();
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), "utf8");
}

export async function readStore(): Promise<StoreData> {
  return ensureStore();
}

export async function writeStore(data: StoreData): Promise<void> {
  await persist(data);
}

export async function listPublishedArticles(): Promise<Article[]> {
  const store = await readStore();
  return store.articles
    .filter((article) => article.status === "published")
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
}

export async function listArticlesByStatus(status: EditorialStatus): Promise<Article[]> {
  const store = await readStore();
  return store.articles
    .filter((article) => article.status === status)
    .sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));
}

export async function getArticleBySlug(slug: string): Promise<Article | undefined> {
  const store = await readStore();
  return store.articles.find((article) => article.slug === slug);
}

export async function getArticleById(id: string): Promise<Article | undefined> {
  const store = await readStore();
  return store.articles.find((article) => article.id === id);
}

export async function upsertArticles(articles: Article[]): Promise<{
  added: number;
  merged: number;
}> {
  const store = await readStore();
  let added = 0;
  let merged = 0;

  for (const article of articles) {
    const incomingSources = getArticleSources(article);
    const existing = store.articles.find((item) => {
      const existingSources = getArticleSources(item);
      const sameUrl = existingSources.some((source) =>
        incomingSources.some((incoming) => incoming.url === source.url),
      );
      return (
        sameUrl ||
        item.slug === article.slug ||
        normalizeTitle(item.title) === normalizeTitle(article.title)
      );
    });

    if (!existing) {
      store.articles.unshift(applyPrimarySource(article, incomingSources));
      added += 1;
      continue;
    }

    const combined = mergeArticleSources(getArticleSources(existing), incomingSources);
    if (combined.length > getArticleSources(existing).length) {
      Object.assign(existing, applyPrimarySource(existing, combined));
      existing.credibilityScore = Math.min(
        97,
        existing.credibilityScore + (combined.length - 1) * 2,
      );
      existing.explainability = `${existing.explainability} Additional corroborating source(s) were attached.`;
      merged += 1;
    }
  }

  await persist(store);
  return { added, merged };
}

export async function updateArticleStatus(
  id: string,
  status: EditorialStatus,
  options?: { validatedBy?: string },
): Promise<Article | null> {
  const store = await readStore();
  const article = store.articles.find((item) => item.id === id);
  if (!article) return null;

  article.status = status;
  if (status === "validated" || status === "published") {
    article.validatedAt = new Date().toISOString();
    article.validatedBy = options?.validatedBy ?? "editor";
  }
  if (status === "published") {
    article.publishedAt = new Date().toISOString();
  }

  await persist(store);
  return article;
}

export type ArticleEditableFields = Partial<
  Pick<
    Article,
    | "title"
    | "summary"
    | "body"
    | "category"
    | "country"
    | "keywords"
    | "explainability"
    | "impactScore"
    | "credibilityScore"
    | "sources"
  >
>;

export async function updateArticleContent(
  id: string,
  fields: ArticleEditableFields,
): Promise<Article | null> {
  const store = await readStore();
  const article = store.articles.find((item) => item.id === id);
  if (!article) return null;

  if (fields.title !== undefined) article.title = fields.title.trim();
  if (fields.summary !== undefined) article.summary = fields.summary.trim();
  if (fields.body !== undefined) article.body = fields.body.trim();
  if (fields.category !== undefined) article.category = fields.category;
  if (fields.country !== undefined) {
    article.country = fields.country.trim() || undefined;
  }
  if (fields.keywords !== undefined) {
    article.keywords = fields.keywords.map((keyword) => keyword.trim()).filter(Boolean);
  }
  if (fields.explainability !== undefined) {
    article.explainability = fields.explainability.trim();
  }
  if (fields.impactScore !== undefined) {
    article.impactScore = Math.max(0, Math.min(100, Math.round(fields.impactScore)));
  }
  if (fields.credibilityScore !== undefined) {
    article.credibilityScore = Math.max(
      0,
      Math.min(100, Math.round(fields.credibilityScore)),
    );
  }
  if (fields.sources !== undefined) {
    const sources = fields.sources
      .map((source) => ({
        id: source.id,
        name: source.name.trim(),
        url: source.url.trim(),
        reliability: source.reliability,
      }))
      .filter((source) => source.name && source.url);
    Object.assign(article, applyPrimarySource(article, sources));
  }

  article.processedAt = new Date().toISOString();
  await persist(store);
  return article;
}

export async function searchArticles(query: string): Promise<Article[]> {
  const q = query.trim().toLowerCase();
  if (!q) return listPublishedArticles();

  const published = await listPublishedArticles();
  return published.filter((article) => {
    const sources = getArticleSources(article)
      .map((source) => `${source.name} ${source.url}`)
      .join(" ");
    const haystack = [
      article.title,
      article.summary,
      article.body,
      article.category,
      article.sourceName,
      sources,
      ...article.keywords,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { slugify } from "./slugify";
import {
  applyPrimarySource,
  getArticleSources,
  mergeArticleSources,
} from "./sources";
import type { Article, EditorialStatus, Source, StoreData } from "./types";

const SEED_PATH = path.join(process.cwd(), "data", "store.json");
const LOCAL_PATH = path.join(process.cwd(), "data", "store.json");
const VERCEL_PATH = path.join("/tmp", "dopa-store.json");

function writableStorePath(): string {
  return process.env.VERCEL ? VERCEL_PATH : LOCAL_PATH;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 96);
}

async function readJsonFile(filePath: string): Promise<StoreData | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as StoreData;
  } catch {
    return null;
  }
}

async function ensureStore(): Promise<StoreData> {
  const target = writableStorePath();
  const existing = await readJsonFile(target);
  if (existing) return existing;

  const seed = await readJsonFile(SEED_PATH);
  const data: StoreData = seed ?? {
    version: 1,
    updatedAt: new Date().toISOString(),
    sources: [],
    articles: [],
  };

  await persist(data);
  return data;
}

async function persist(data: StoreData): Promise<void> {
  data.updatedAt = new Date().toISOString();
  const target = writableStorePath();
  try {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, JSON.stringify(data, null, 2), "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    throw new Error(
      `Could not save knowledge store (${message}). On Vercel, writable storage must use /tmp or a database.`,
    );
  }
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

const MERGEABLE_STATUSES = new Set<EditorialStatus>([
  "collected",
  "processed",
  "ai_enriched",
  "pending_validation",
]);

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

    // Exact same URL already known: only merge into open review items.
    const sameUrl = getArticleSources(existing).some((source) =>
      incomingSources.some((incoming) => incoming.url === source.url),
    );

    if (sameUrl && !MERGEABLE_STATUSES.has(existing.status)) {
      continue;
    }

    // Similar title on an already published/rejected story: add a fresh review candidate.
    if (!MERGEABLE_STATUSES.has(existing.status) && !sameUrl) {
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
      if (existing.status !== "pending_validation") {
        existing.status = "pending_validation";
      }
      merged += 1;
    }
  }

  await persist(store);
  return { added, merged };
}

export async function createPendingArticle(input: {
  title: string;
  summary: string;
  body?: string;
  category: Article["category"];
  country?: string;
  sourceName: string;
  sourceUrl: string;
  keywords?: string[];
}): Promise<Article> {
  const store = await readStore();
  const now = new Date().toISOString();
  const sources = [
    {
      name: input.sourceName.trim(),
      url: input.sourceUrl.trim(),
      reliability: 0.75,
    },
  ];

  const article = applyPrimarySource(
    {
      id: nanoid(),
      slug: `${slugify(input.title)}-${nanoid(6)}`,
      title: input.title.trim(),
      summary: input.summary.trim(),
      body: (input.body || input.summary).trim(),
      category: input.category,
      status: "pending_validation",
      sourceId: "src-manual",
      sourceName: sources[0].name,
      sourceUrl: sources[0].url,
      sources,
      originalLanguage: "en",
      country: input.country?.trim() || undefined,
      keywords: input.keywords?.map((keyword) => keyword.trim()).filter(Boolean) ?? [],
      impactScore: 70,
      credibilityScore: 75,
      explainability:
        "Manually submitted for editorial review. Verify sources and claims before publishing.",
      collectedAt: now,
      processedAt: now,
      discoveryMethod: "manual",
    },
    sources,
  );

  store.articles.unshift(article);
  await persist(store);
  return article;
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

export async function listTrustedSources(): Promise<Source[]> {
  const store = await readStore();
  return store.sources.sort((a, b) => a.name.localeCompare(b.name));
}

export async function upsertTrustedSource(
  input: Omit<Source, "id"> & { id?: string },
): Promise<Source> {
  const store = await readStore();
  const existingIndex = input.id
    ? store.sources.findIndex((source) => source.id === input.id)
    : -1;

  const source: Source = {
    id: input.id || `src-${nanoid(8)}`,
    name: input.name.trim(),
    url: input.url.trim(),
    feedUrl: input.feedUrl?.trim() || undefined,
    reliability: Math.max(0, Math.min(1, input.reliability)),
    notes: input.notes?.trim() || undefined,
    enabled: input.enabled ?? true,
    recommendedBy: input.recommendedBy?.trim() || undefined,
    channel: input.channel || "rss",
  };

  if (existingIndex >= 0) {
    store.sources[existingIndex] = source;
  } else {
    store.sources.push(source);
  }

  await persist(store);
  return source;
}

export async function deleteTrustedSource(id: string): Promise<boolean> {
  const store = await readStore();
  const before = store.sources.length;
  store.sources = store.sources.filter((source) => source.id !== id);
  if (store.sources.length === before) return false;
  await persist(store);
  return true;
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
      article.country ?? "",
      sources,
      ...article.keywords,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

import { promises as fs } from "fs";
import path from "path";
import { list, put } from "@vercel/blob";
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
const VERCEL_TMP_PATH = path.join("/tmp", "dopa-store.json");
const BLOB_PATHNAME = "dopa-store.json";

type StorageMode = "blob" | "github" | "file" | "memory";

declare global {
  // eslint-disable-next-line no-var
  var __dopaStoreCache: StoreData | undefined;
  // eslint-disable-next-line no-var
  var __dopaStoreLoadedAt: number | undefined;
  // eslint-disable-next-line no-var
  var __dopaStoreSha: string | undefined;
  // eslint-disable-next-line no-var
  var __dopaBlobUrl: string | undefined;
}

/** Short TTL so multi-instance / durable backends see fresh publishes. */
const CACHE_TTL_MS = 2_000;

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 96);
}

function emptyStore(): StoreData {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    sources: [],
    articles: [],
  };
}

async function readSeed(): Promise<StoreData> {
  try {
    const raw = await fs.readFile(SEED_PATH, "utf8");
    return JSON.parse(raw) as StoreData;
  } catch {
    return emptyStore();
  }
}

function detectStorageMode(): StorageMode {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  if (process.env.STORE_GITHUB_TOKEN || process.env.GITHUB_TOKEN) return "github";
  if (process.env.VERCEL) return "memory";
  return "file";
}

export function getStorageMode(): StorageMode {
  return detectStorageMode();
}

async function readFromGitHub(): Promise<{ data: StoreData; sha?: string } | null> {
  const token = process.env.STORE_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) return null;

  const owner = process.env.STORE_GITHUB_OWNER || "KCommunity";
  const repo = process.env.STORE_GITHUB_REPO || "WebSite_Dopa_News";
  const filePath = process.env.STORE_GITHUB_PATH || "data/store.json";

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "DopaNews",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) return null;
  const payload = (await response.json()) as { content?: string; sha?: string };
  if (!payload.content) return null;
  const json = Buffer.from(payload.content, "base64").toString("utf8");
  return { data: JSON.parse(json) as StoreData, sha: payload.sha };
}

async function writeToGitHub(data: StoreData): Promise<void> {
  const token = process.env.STORE_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) throw new Error("Missing STORE_GITHUB_TOKEN for durable storage");

  const owner = process.env.STORE_GITHUB_OWNER || "KCommunity";
  const repo = process.env.STORE_GITHUB_REPO || "WebSite_Dopa_News";
  const filePath = process.env.STORE_GITHUB_PATH || "data/store.json";
  const sha = globalThis.__dopaStoreSha;

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "DopaNews",
      },
      body: JSON.stringify({
        message: "chore: update Dopa News knowledge store",
        content: Buffer.from(JSON.stringify(data, null, 2), "utf8").toString("base64"),
        sha,
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub store write failed: ${response.status} ${detail}`);
  }

  const payload = (await response.json()) as { content?: { sha?: string } };
  globalThis.__dopaStoreSha = payload.content?.sha;
}

async function readFromBlob(): Promise<StoreData | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;

  const knownUrl = globalThis.__dopaBlobUrl || process.env.DOPA_BLOB_STORE_URL;
  const urls: string[] = [];
  if (knownUrl) urls.push(knownUrl);

  try {
    const listed = await list({
      prefix: BLOB_PATHNAME.replace(/\.json$/, ""),
      token: process.env.BLOB_READ_WRITE_TOKEN,
      limit: 20,
    });
    for (const blob of listed.blobs) {
      if (blob.pathname === BLOB_PATHNAME || blob.pathname.endsWith(BLOB_PATHNAME)) {
        urls.unshift(blob.url);
        globalThis.__dopaBlobUrl = blob.url;
      }
    }
  } catch (error) {
    console.error("Blob list failed:", error);
  }

  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) {
        globalThis.__dopaBlobUrl = url;
        return (await response.json()) as StoreData;
      }
    } catch (error) {
      console.error("Blob fetch failed:", error);
    }
  }

  return null;
}

async function writeToBlob(data: StoreData): Promise<void> {
  const blob = await put(BLOB_PATHNAME, JSON.stringify(data, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  globalThis.__dopaBlobUrl = blob.url;
}

async function readFromFile(): Promise<StoreData | null> {
  const target = process.env.VERCEL ? VERCEL_TMP_PATH : LOCAL_PATH;
  try {
    const raw = await fs.readFile(target, "utf8");
    return JSON.parse(raw) as StoreData;
  } catch {
    return null;
  }
}

async function writeToFile(data: StoreData): Promise<void> {
  const target = process.env.VERCEL ? VERCEL_TMP_PATH : LOCAL_PATH;
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(data, null, 2), "utf8");
}

async function loadStore(): Promise<StoreData> {
  const mode = detectStorageMode();
  const now = Date.now();
  const cacheAge = now - (globalThis.__dopaStoreLoadedAt ?? 0);
  const cacheFresh =
    Boolean(globalThis.__dopaStoreCache) && cacheAge < CACHE_TTL_MS;

  // Memory mode has no durable backend — keep the in-process cache.
  if (mode === "memory" && globalThis.__dopaStoreCache) {
    return globalThis.__dopaStoreCache;
  }

  // File/blob/github: re-read often so publishes show up on other requests.
  if (cacheFresh && globalThis.__dopaStoreCache) {
    return globalThis.__dopaStoreCache;
  }

  let data: StoreData | null = null;

  if (mode === "blob") {
    data = await readFromBlob();
  } else if (mode === "github") {
    const github = await readFromGitHub();
    if (github) {
      data = github.data;
      globalThis.__dopaStoreSha = github.sha;
    }
  } else if (mode === "file") {
    data = await readFromFile();
  } else {
    data = (await readFromFile()) ?? globalThis.__dopaStoreCache ?? null;
  }

  if (!data) {
    data = globalThis.__dopaStoreCache ?? (await readSeed());
  }

  globalThis.__dopaStoreCache = data;
  globalThis.__dopaStoreLoadedAt = now;
  return data;
}

async function persist(data: StoreData): Promise<void> {
  data.updatedAt = new Date().toISOString();
  globalThis.__dopaStoreCache = data;
  globalThis.__dopaStoreLoadedAt = Date.now();

  const mode = detectStorageMode();
  if (mode === "blob") {
    await writeToBlob(data);
    return;
  }
  if (mode === "github") {
    await writeToGitHub(data);
    return;
  }
  if (mode === "file") {
    await writeToFile(data);
    return;
  }

  // memory mode on Vercel without durable backend
  try {
    await writeToFile(data);
  } catch {
    // Keep memory cache even if /tmp fails.
  }
}

export async function readStore(): Promise<StoreData> {
  return loadStore();
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

/** All articles for the editorial review desk (pending first). */
export async function listAllArticlesForReview(): Promise<Article[]> {
  const store = await readStore();
  const rank = (status: EditorialStatus) => {
    if (status === "pending_validation") return 0;
    if (status === "published") return 1;
    if (status === "rejected") return 3;
    return 2;
  };

  return [...store.articles].sort((a, b) => {
    const byStatus = rank(a.status) - rank(b.status);
    if (byStatus !== 0) return byStatus;
    return b.collectedAt.localeCompare(a.collectedAt);
  });
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
  articles: Article[];
}> {
  const store = await readStore();
  let added = 0;
  let merged = 0;
  const touched: Article[] = [];

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
      const created = applyPrimarySource(article, incomingSources);
      store.articles.unshift(created);
      touched.push(created);
      added += 1;
      continue;
    }

    const sameUrl = getArticleSources(existing).some((source) =>
      incomingSources.some((incoming) => incoming.url === source.url),
    );

    if (sameUrl && !MERGEABLE_STATUSES.has(existing.status)) {
      continue;
    }

    if (!MERGEABLE_STATUSES.has(existing.status) && !sameUrl) {
      const created = applyPrimarySource(article, incomingSources);
      store.articles.unshift(created);
      touched.push(created);
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
      touched.push(existing);
      merged += 1;
    }
  }

  await persist(store);
  return { added, merged, articles: touched };
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

/**
 * Re-insert a client-held article when the server store lost it
 * (common in Vercel memory mode across instances).
 */
export async function ensureArticleInStore(article: Article): Promise<Article> {
  const store = await readStore();
  const existing = store.articles.find((item) => item.id === article.id);
  if (existing) return existing;

  const restored = applyPrimarySource(article, getArticleSources(article));
  if (restored.status === "published" || restored.status === "rejected") {
    restored.status = "pending_validation";
  }
  store.articles.unshift(restored);
  await persist(store);
  return restored;
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

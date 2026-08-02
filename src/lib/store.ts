import { promises as fs } from "fs";
import path from "path";
import type { Article, EditorialStatus, StoreData } from "./types";

const DATA_PATH = path.join(process.cwd(), "data", "store.json");

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

export async function upsertArticles(articles: Article[]): Promise<number> {
  const store = await readStore();
  let added = 0;

  for (const article of articles) {
    const exists = store.articles.some(
      (existing) =>
        existing.sourceUrl === article.sourceUrl ||
        existing.slug === article.slug ||
        existing.title.toLowerCase() === article.title.toLowerCase(),
    );
    if (!exists) {
      store.articles.unshift(article);
      added += 1;
    }
  }

  await persist(store);
  return added;
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

export async function searchArticles(query: string): Promise<Article[]> {
  const q = query.trim().toLowerCase();
  if (!q) return listPublishedArticles();

  const published = await listPublishedArticles();
  return published.filter((article) => {
    const haystack = [
      article.title,
      article.summary,
      article.body,
      article.category,
      article.sourceName,
      ...article.keywords,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

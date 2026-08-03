import type { Article } from "./types";

const STORAGE_KEY = "dopa-pending-queue-v1";

export function readLocalPendingQueue(): Article[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Article[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocalPendingQueue(articles: Article[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(articles));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function mergeIntoLocalPendingQueue(articles: Article[]): Article[] {
  const current = readLocalPendingQueue();
  const byId = new Map<string, Article>();
  for (const article of [...articles, ...current]) {
    if (article.status !== "pending_validation") continue;
    byId.set(article.id, article);
  }
  const merged = [...byId.values()].sort((a, b) =>
    b.collectedAt.localeCompare(a.collectedAt),
  );
  writeLocalPendingQueue(merged);
  return merged;
}

export function removeFromLocalPendingQueue(id: string): void {
  const next = readLocalPendingQueue().filter((article) => article.id !== id);
  writeLocalPendingQueue(next);
}

export function mergeServerAndLocalPending(serverPending: Article[]): Article[] {
  const local = readLocalPendingQueue();
  const byId = new Map<string, Article>();
  for (const article of [...local, ...serverPending]) {
    if (article.status !== "pending_validation") continue;
    byId.set(article.id, article);
  }
  const merged = [...byId.values()].sort((a, b) =>
    b.collectedAt.localeCompare(a.collectedAt),
  );
  writeLocalPendingQueue(merged);
  return merged;
}

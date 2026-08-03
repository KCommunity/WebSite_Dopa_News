import type { Article } from "./types";

const STORAGE_KEY = "dopa-pending-queue-v1";
const DISMISSED_KEY = "dopa-dismissed-ids-v1";

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

export function readDismissedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(DISMISSED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function markDismissed(id: string): void {
  if (typeof window === "undefined") return;
  const next = readDismissedIds();
  next.add(id);
  try {
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

export function mergeIntoLocalPendingQueue(articles: Article[]): Article[] {
  const dismissed = readDismissedIds();
  const current = readLocalPendingQueue();
  const byId = new Map<string, Article>();
  for (const article of [...articles, ...current]) {
    if (article.status !== "pending_validation") continue;
    if (dismissed.has(article.id)) continue;
    byId.set(article.id, article);
  }
  const merged = [...byId.values()].sort((a, b) =>
    b.collectedAt.localeCompare(a.collectedAt),
  );
  writeLocalPendingQueue(merged);
  return merged;
}

export function removeFromLocalPendingQueue(id: string): void {
  markDismissed(id);
  const next = readLocalPendingQueue().filter((article) => article.id !== id);
  writeLocalPendingQueue(next);
}

export function mergeServerAndLocalPending(serverPending: Article[]): Article[] {
  const dismissed = readDismissedIds();
  const local = readLocalPendingQueue();
  const byId = new Map<string, Article>();
  for (const article of [...local, ...serverPending]) {
    if (article.status !== "pending_validation") continue;
    if (dismissed.has(article.id)) continue;
    byId.set(article.id, article);
  }
  const merged = [...byId.values()].sort((a, b) =>
    b.collectedAt.localeCompare(a.collectedAt),
  );
  writeLocalPendingQueue(merged);
  return merged;
}

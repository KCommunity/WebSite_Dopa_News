"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  mergeServerAndLocalPending,
  removeFromLocalPendingQueue,
  writeLocalPendingQueue,
} from "@/lib/pending-queue";
import type { Article } from "@/lib/types";

type DeskStats = {
  pendingServer: number;
  published: number;
  total: number;
};

type PendingQueueContextValue = {
  pending: Article[];
  stats: DeskStats;
  addPending: (articles: Article[]) => void;
  resolvePending: (id: string, outcome?: "published" | "rejected") => void;
};

const PendingQueueContext = createContext<PendingQueueContextValue | null>(null);

export function PendingQueueProvider({
  serverPending,
  publishedCount,
  totalCount,
  children,
}: {
  serverPending: Article[];
  publishedCount: number;
  totalCount: number;
  children: React.ReactNode;
}) {
  const [pending, setPending] = useState<Article[]>(() => serverPending);
  const [stats, setStats] = useState<DeskStats>({
    pendingServer: serverPending.length,
    published: publishedCount,
    total: totalCount,
  });

  useEffect(() => {
    setPending(mergeServerAndLocalPending(serverPending));
    setStats({
      pendingServer: serverPending.length,
      published: publishedCount,
      total: totalCount,
    });
  }, [serverPending, publishedCount, totalCount]);

  const addPending = useCallback((articles: Article[]) => {
    setPending((current) => {
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
    });
    setStats((current) => ({
      pendingServer: current.pendingServer + articles.length,
      published: current.published,
      total: current.total + articles.length,
    }));
  }, []);

  const resolvePending = useCallback(
    (id: string, outcome: "published" | "rejected" = "rejected") => {
      removeFromLocalPendingQueue(id);
      setPending((current) => current.filter((article) => article.id !== id));
      setStats((current) => ({
        pendingServer: Math.max(0, current.pendingServer - 1),
        published:
          outcome === "published" ? current.published + 1 : current.published,
        total: current.total,
      }));
    },
    [],
  );

  const value = useMemo(
    () => ({ pending, stats, addPending, resolvePending }),
    [pending, stats, addPending, resolvePending],
  );

  return (
    <PendingQueueContext.Provider value={value}>
      {children}
    </PendingQueueContext.Provider>
  );
}

export function usePendingQueue() {
  const ctx = useContext(PendingQueueContext);
  if (!ctx) {
    throw new Error("usePendingQueue must be used within PendingQueueProvider");
  }
  return ctx;
}

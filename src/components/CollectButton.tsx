"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EDITORIAL_THEMES,
  type EditorialThemeId,
} from "@/lib/editorial-focus";
import {
  FOCUS_REGIONS,
  type FocusRegionId,
} from "@/lib/regions";
import { usePendingQueue } from "@/components/PendingQueueProvider";
import type { Article } from "@/lib/types";

export function CollectButton() {
  const router = useRouter();
  const { addPending } = usePendingQueue();
  const [busy, setBusy] = useState<"rss" | "web" | null>(null);
  const [activeTheme, setActiveTheme] = useState<EditorialThemeId | "all">(
    "all",
  );
  const [query, setQuery] = useState("");
  const [maxResults, setMaxResults] = useState(5);
  const [regions, setRegions] = useState<FocusRegionId[]>(
    FOCUS_REGIONS.map((region) => region.id),
  );
  const [message, setMessage] = useState<string | null>(null);

  function toggleRegion(id: FocusRegionId) {
    setRegions((current) => {
      if (current.includes(id)) {
        return current.length === 1 ? current : current.filter((item) => item !== id);
      }
      return [...current, id];
    });
  }

  function selectTheme(id: EditorialThemeId | "all") {
    setActiveTheme(id);
    if (id === "all") {
      setQuery("");
      return;
    }
    const theme = EDITORIAL_THEMES.find((item) => item.id === id);
    if (theme) setQuery(theme.query);
  }

  function resolveSearchQuery(): string {
    const typed = query.trim();
    if (typed) return typed;
    if (activeTheme !== "all") {
      return EDITORIAL_THEMES.find((theme) => theme.id === activeTheme)?.query ?? "";
    }
    // Empty = server uses the full multi-theme default (last 7 days).
    return "";
  }

  async function collectRss() {
    setBusy("rss");
    setMessage(null);
    try {
      const response = await fetch("/api/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "rss" }),
      });
      const payload = (await response.json()) as {
        error?: string;
        fetched?: number;
        accepted?: number;
        added?: number;
        articles?: Article[];
      };
      if (!response.ok) throw new Error(payload.error || "Collection failed");
      if (payload.articles?.length) addPending(payload.articles);
      setMessage(
        `RSS: fetched ${payload.fetched}, accepted ${payload.accepted}, added ${payload.added ?? payload.articles?.length ?? 0}.`,
      );
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Collection failed");
    } finally {
      setBusy(null);
    }
  }

  async function collectWeb(event: FormEvent) {
    event.preventDefault();
    setBusy("web");
    setMessage(null);
    try {
      const response = await fetch("/api/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "web",
          query: resolveSearchQuery(),
          regions,
          maxResults: Number(maxResults) || 5,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        fetched?: number;
        accepted?: number;
        added?: number;
        channel?: string;
        regions?: string[];
        articles?: Article[];
      };
      if (!response.ok) throw new Error(payload.error || "Internet search failed");

      const articles = payload.articles ?? [];
      if (articles.length) {
        addPending(articles);
      }

      const regionNote = payload.regions?.length
        ? ` in ${payload.regions.join(", ")}`
        : "";
      const channelNote =
        payload.channel === "trusted_rss"
          ? " (trusted RSS fallback)"
          : payload.channel === "mixed"
            ? " (Google News + trusted RSS)"
            : payload.channel === "google_news"
              ? " (Google News, last 7 days)"
              : "";

      setMessage(
        articles.length > 0
          ? `Added ${articles.length} recent news item(s)${regionNote}${channelNote}. Open Review News to validate them.`
          : `Search finished with no new items (fetched ${payload.fetched}, accepted ${payload.accepted}). Try another theme or subject.`,
      );
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Internet search failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="collect-panel">
      <div className="collect-actions">
        <button type="button" disabled={busy !== null} onClick={collectRss}>
          {busy === "rss" ? "Collecting…" : "Run RSS collection"}
        </button>
      </div>

      <form className="web-search-form" onSubmit={collectWeb}>
        <label htmlFor="web-query">Internet search — recent news</label>
        <p className="collect-hint">
          Focus lines: personal triumph, health wins, happy endings, happy
          family stories, and new energy. Results prefer the last 7 days from
          newspapers and news sites (Google News). Social-network APIs are not
          connected yet.
        </p>

        <div className="region-chips" role="group" aria-label="Story themes">
          <button
            type="button"
            className={activeTheme === "all" ? "region-chip active" : "region-chip"}
            onClick={() => selectTheme("all")}
            disabled={busy !== null}
          >
            All focus lines
          </button>
          {EDITORIAL_THEMES.map((theme) => {
            const active = activeTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                className={active ? "region-chip active" : "region-chip"}
                onClick={() => selectTheme(theme.id)}
                disabled={busy !== null}
                title={theme.description}
              >
                {theme.label}
              </button>
            );
          })}
        </div>

        <div className="region-chips" role="group" aria-label="Focus regions">
          {FOCUS_REGIONS.map((region) => {
            const active = regions.includes(region.id);
            return (
              <button
                key={region.id}
                type="button"
                className={active ? "region-chip active" : "region-chip"}
                onClick={() => toggleRegion(region.id)}
                disabled={busy !== null}
              >
                {region.label}
              </button>
            );
          })}
        </div>

        <div className="web-search-row">
          <input
            id="web-query"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveTheme("all");
            }}
            placeholder="Optional subject, or leave blank for all focus lines"
            disabled={busy !== null}
          />
          <label className="max-results-field" htmlFor="max-results">
            Max results
            <input
              id="max-results"
              type="number"
              min={1}
              max={25}
              value={maxResults}
              onChange={(event) => setMaxResults(Number(event.target.value) || 5)}
              disabled={busy !== null}
            />
          </label>
          <button type="submit" disabled={busy !== null || regions.length === 0}>
            {busy === "web" ? "Searching…" : "Search & collect"}
          </button>
        </div>
      </form>

      {message ? <p className="collect-message">{message}</p> : null}
    </div>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_WEB_SEARCH_TOPIC,
  FOCUS_REGIONS,
  type FocusRegionId,
} from "@/lib/regions";
import { mergeIntoLocalPendingQueue } from "@/lib/pending-queue";
import type { Article } from "@/lib/types";

export function CollectButton() {
  const router = useRouter();
  const [busy, setBusy] = useState<"rss" | "web" | null>(null);
  const [query, setQuery] = useState(DEFAULT_WEB_SEARCH_TOPIC);
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
        merged?: number;
      };
      if (!response.ok) throw new Error(payload.error || "Collection failed");
      setMessage(
        `RSS: fetched ${payload.fetched}, accepted ${payload.accepted}, added ${payload.added}, merged sources on ${payload.merged}.`,
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
          query,
          regions,
          maxResults: Number(maxResults) || 5,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        fetched?: number;
        accepted?: number;
        added?: number;
        merged?: number;
        query?: string;
        regions?: string[];
        maxResults?: number;
        channel?: string;
        storageMode?: string;
        articles?: Article[];
      };
      if (!response.ok) throw new Error(payload.error || "Internet search failed");

      if (payload.articles?.length) {
        mergeIntoLocalPendingQueue(payload.articles);
        window.dispatchEvent(new Event("dopa-pending-updated"));
      }

      const added = payload.added ?? payload.articles?.length ?? 0;
      const channelNote =
        payload.channel === "trusted_rss"
          ? " (trusted RSS)"
          : payload.channel === "mixed"
            ? " (Google News + trusted RSS)"
            : "";
      const storageNote =
        payload.storageMode === "memory"
          ? " Results are kept in this browser session until durable storage (Vercel Blob) is connected."
          : "";

      setMessage(
        added > 0
          ? `Added ${added} news item(s) to the validation queue${channelNote}. Max ${payload.maxResults}. Fetched ${payload.fetched}, accepted ${payload.accepted}.${storageNote}`
          : `Search finished${channelNote}, but no new queue items were created (fetched ${payload.fetched}, accepted ${payload.accepted}, merged ${payload.merged}).${storageNote}`,
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
        <label htmlFor="web-query">Internet search (site assistants)</label>
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
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Optional topic, e.g. vaccine OR solar OR education"
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
        <p className="collect-hint">
          Searches Google News for positive progress in selected regions (default
          max 5). If Google News is blocked, falls back to trusted RSS feeds.
        </p>
      </form>

      {message ? <p className="collect-message">{message}</p> : null}
    </div>
  );
}

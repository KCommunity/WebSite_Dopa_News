"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_WEB_SEARCH_TOPIC,
  FOCUS_REGIONS,
  type FocusRegionId,
} from "@/lib/regions";
import { usePendingQueue } from "@/components/PendingQueueProvider";
import type { Article } from "@/lib/types";

export function CollectButton() {
  const router = useRouter();
  const { addPending } = usePendingQueue();
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
              ? " (Google News)"
              : "";

      setMessage(
        articles.length > 0
          ? `Added ${articles.length} news item(s)${regionNote}${channelNote}. Review them in the validation queue below.`
          : `Search finished with no new items (fetched ${payload.fetched}, accepted ${payload.accepted}). Try another subject.`,
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
        <label htmlFor="web-query">Internet search by subject</label>
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
            placeholder="Subject, e.g. solar energy OR vaccine"
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
          Searches Google News for each selected region and your subject, then
          fills gaps from trusted RSS. New items appear in the validation queue
          below — edit, then publish the ones you like.
        </p>
      </form>

      {message ? <p className="collect-message">{message}</p> : null}
    </div>
  );
}

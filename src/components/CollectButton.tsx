"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_WEB_SEARCH_TOPIC,
  FOCUS_REGIONS,
  type FocusRegionId,
} from "@/lib/regions";

export function CollectButton() {
  const router = useRouter();
  const [busy, setBusy] = useState<"rss" | "web" | null>(null);
  const [query, setQuery] = useState(DEFAULT_WEB_SEARCH_TOPIC);
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
        body: JSON.stringify({ mode: "web", query, regions }),
      });
      const payload = (await response.json()) as {
        error?: string;
        fetched?: number;
        accepted?: number;
        added?: number;
        merged?: number;
        query?: string;
        regions?: string[];
      };
      if (!response.ok) throw new Error(payload.error || "Internet search failed");
      const added = payload.added ?? 0;
      const merged = payload.merged ?? 0;
      setMessage(
        added > 0
          ? `Web search “${payload.query}” in ${payload.regions?.join(", ")}: added ${added} news item(s) to the validation queue${merged ? ` (also merged sources on ${merged})` : ""}.`
          : `Web search finished, but no new queue items were created${merged ? ` (updated sources on ${merged} existing item(s))` : ""}. Try Add news for review, or a more specific topic.`,
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
          <button type="submit" disabled={busy !== null || regions.length === 0}>
            {busy === "web" ? "Searching…" : "Search & collect"}
          </button>
        </div>
        <p className="collect-hint">
          Built into the site — not Cursor. Searches Google News for positive
          progress in selected regions, then adds candidates to the validation
          queue.
        </p>
      </form>

      {message ? <p className="collect-message">{message}</p> : null}
    </div>
  );
}

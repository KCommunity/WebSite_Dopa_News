"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { mergeIntoLocalPendingQueue } from "@/lib/pending-queue";
import { TAXONOMY } from "@/lib/taxonomy";
import type { Article, CategorySlug } from "@/lib/types";

export function ManualNewsForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<CategorySlug>("community");
  const [country, setCountry] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [keywords, setKeywords] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    try {
      const response = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          summary,
          body: body || undefined,
          category,
          country: country || undefined,
          sourceName,
          sourceUrl,
          keywords: keywords || undefined,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        article?: Article;
      };
      if (!response.ok) throw new Error(payload.error || "Could not add news");

      if (payload.article) {
        mergeIntoLocalPendingQueue([payload.article]);
        window.dispatchEvent(new Event("dopa-pending-updated"));
      }

      setTitle("");
      setSummary("");
      setBody("");
      setCountry("");
      setSourceName("");
      setSourceUrl("");
      setKeywords("");
      setMessage("News added to the validation queue.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not add news");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="manual-news">
      <div className="section-head">
        <h2 className="page-title" style={{ fontSize: "1.8rem" }}>
          Add news for review
        </h2>
        <p className="lede">
          Manually submit a story to the validation queue. Useful when internet
          search only finds sources, or when you have a tip from a trusted outlet.
        </p>
      </div>

      <form className="admin-edit-form" onSubmit={onSubmit}>
        <label>
          Title
          <input
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          Summary
          <textarea
            required
            rows={3}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
          />
        </label>
        <label>
          Full article (optional)
          <textarea
            rows={5}
            value={body}
            onChange={(event) => setBody(event.target.value)}
          />
        </label>
        <div className="admin-edit-grid">
          <label>
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as CategorySlug)}
            >
              {TAXONOMY.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Country / region
            <input
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              placeholder="e.g. Sweden, Canada, China"
            />
          </label>
          <label>
            Source name
            <input
              required
              value={sourceName}
              onChange={(event) => setSourceName(event.target.value)}
              placeholder="Outlet name"
            />
          </label>
          <label>
            Source URL
            <input
              required
              type="url"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://..."
            />
          </label>
        </div>
        <label>
          Keywords (comma-separated, optional)
          <input
            value={keywords}
            onChange={(event) => setKeywords(event.target.value)}
          />
        </label>
        <div className="admin-actions">
          <button type="submit" disabled={busy}>
            {busy ? "Adding…" : "Add to validation queue"}
          </button>
        </div>
      </form>
      {message ? <p className="collect-message">{message}</p> : null}
    </section>
  );
}

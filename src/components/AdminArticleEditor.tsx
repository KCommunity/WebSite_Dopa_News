"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getArticleSources } from "@/lib/sources";
import { TAXONOMY } from "@/lib/taxonomy";
import type { Article, ArticleSource, CategorySlug } from "@/lib/types";

type SourceDraft = {
  key: string;
  name: string;
  url: string;
};

function toDrafts(sources: ArticleSource[]): SourceDraft[] {
  return sources.map((source, index) => ({
    key: `${source.url}-${index}`,
    name: source.name,
    url: source.url,
  }));
}

export function AdminArticleEditor({
  article,
  onResolved,
}: {
  article: Article;
  onResolved?: () => void;
}) {
  const router = useRouter();
  const initialSources = useMemo(
    () => toDrafts(getArticleSources(article)),
    [article],
  );

  const [editing, setEditing] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [busy, setBusy] = useState<"save" | "publish" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [title, setTitle] = useState(article.title);
  const [summary, setSummary] = useState(article.summary);
  const [body, setBody] = useState(article.body);
  const [category, setCategory] = useState<CategorySlug>(article.category);
  const [country, setCountry] = useState(article.country ?? "");
  const [keywords, setKeywords] = useState(article.keywords.join(", "));
  const [explainability, setExplainability] = useState(article.explainability);
  const [impactScore, setImpactScore] = useState(String(article.impactScore));
  const [credibilityScore, setCredibilityScore] = useState(
    String(article.credibilityScore),
  );
  const [sources, setSources] = useState<SourceDraft[]>(
    initialSources.length
      ? initialSources
      : [{ key: "new-0", name: "", url: "" }],
  );

  function updateSource(key: string, field: "name" | "url", value: string) {
    setSources((current) =>
      current.map((source) =>
        source.key === key ? { ...source, [field]: value } : source,
      ),
    );
  }

  function addSource() {
    setSources((current) => [
      ...current,
      { key: `new-${Date.now()}`, name: "", url: "" },
    ]);
  }

  function removeSource(key: string) {
    setSources((current) =>
      current.length <= 1 ? current : current.filter((source) => source.key !== key),
    );
  }

  function buildUpdatePayload() {
    return {
      action: "update" as const,
      title: title.trim(),
      summary: summary.trim(),
      body: body.trim(),
      category,
      country: country.trim() || undefined,
      keywords: keywords
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean),
      explainability: explainability.trim(),
      impactScore: Number(impactScore),
      credibilityScore: Number(credibilityScore),
      sources: sources
        .map((source) => ({
          name: source.name.trim(),
          url: source.url.trim(),
        }))
        .filter((source) => source.name && source.url),
    };
  }

  async function persistEdits() {
    const payload = buildUpdatePayload();
    if (payload.sources.length === 0) {
      throw new Error("Add at least one source with a name and URL.");
    }

    const response = await fetch(`/api/articles/${article.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(data.error || "Save failed");
  }

  async function saveEdits(event?: FormEvent) {
    event?.preventDefault();
    setBusy("save");
    setError(null);
    setMessage(null);

    try {
      await persistEdits();
      setMessage("Draft saved.");
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }

  async function act(action: "publish" | "reject") {
    setBusy(action);
    setError(null);
    setMessage(null);

    try {
      if (editing || action === "publish") {
        // Always persist latest edits before publish when the form is open.
        if (editing) await persistEdits();
      }

      const response = await fetch(`/api/articles/${article.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Action failed");
      onResolved?.();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="admin-editor">
      {!editing ? (
        <>
          <div className="admin-actions">
            <button type="button" className="ghost" onClick={() => setEditing(true)}>
              Edit article
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => setShowLinks((value) => !value)}
            >
              {showLinks ? "Hide article links" : "Open article links"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => act("publish")}
            >
              {busy === "publish" ? "Publishing…" : "Approve & publish"}
            </button>
            <button
              type="button"
              className="ghost"
              disabled={busy !== null}
              onClick={() => act("reject")}
            >
              Reject
            </button>
          </div>
          {showLinks ? (
            <div className="source-check">
              <strong>Article links</strong>
              <ul>
                {sources
                  .filter((source) => source.url)
                  .map((source) => (
                    <li key={source.key}>
                      <div>
                        <span>{source.name || "Unnamed source"}</span>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="source-open"
                        >
                          Open
                        </a>
                      </div>
                      <code>{source.url}</code>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <form className="admin-edit-form" onSubmit={saveEdits}>
          <label>
            Title
            <input value={title} onChange={(event) => setTitle(event.target.value)} />
          </label>

          <label>
            Summary
            <textarea
              rows={3}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />
          </label>

          <label>
            Full article
            <textarea
              rows={8}
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
              Country
              <input
                value={country}
                onChange={(event) => setCountry(event.target.value)}
              />
            </label>

            <label>
              Impact score
              <input
                type="number"
                min={0}
                max={100}
                value={impactScore}
                onChange={(event) => setImpactScore(event.target.value)}
              />
            </label>

            <label>
              Credibility score
              <input
                type="number"
                min={0}
                max={100}
                value={credibilityScore}
                onChange={(event) => setCredibilityScore(event.target.value)}
              />
            </label>
          </div>

          <label>
            Keywords (comma-separated)
            <input
              value={keywords}
              onChange={(event) => setKeywords(event.target.value)}
            />
          </label>

          <label>
            Explainability
            <textarea
              rows={3}
              value={explainability}
              onChange={(event) => setExplainability(event.target.value)}
            />
          </label>

          <div className="source-editor">
            <div className="source-editor-head">
              <strong>Sources</strong>
              <button type="button" className="ghost" onClick={addSource}>
                Add source
              </button>
            </div>
            {sources.map((source, index) => (
              <div className="source-editor-row" key={source.key}>
                <input
                  placeholder={`Source ${index + 1} name`}
                  value={source.name}
                  onChange={(event) =>
                    updateSource(source.key, "name", event.target.value)
                  }
                />
                <input
                  placeholder="https://..."
                  value={source.url}
                  onChange={(event) =>
                    updateSource(source.key, "url", event.target.value)
                  }
                />
                <a
                  href={source.url || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className={!source.url ? "disabled-link" : undefined}
                  aria-disabled={!source.url}
                  onClick={(event) => {
                    if (!source.url) event.preventDefault();
                  }}
                >
                  Open
                </a>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => removeSource(source.key)}
                  disabled={sources.length <= 1}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="admin-actions">
            <button type="submit" disabled={busy !== null}>
              {busy === "save" ? "Saving…" : "Save draft"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => act("publish")}
            >
              Save & publish
            </button>
            <button
              type="button"
              className="ghost"
              disabled={busy !== null}
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {message ? <p className="collect-message">{message}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}

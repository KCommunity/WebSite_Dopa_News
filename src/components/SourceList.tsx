import { getArticleSources } from "@/lib/sources";
import type { Article } from "@/lib/types";

export function SourceList({ article }: { article: Article }) {
  const sources = getArticleSources(article);

  if (sources.length === 0) {
    return <p className="source-list empty">No sources attached.</p>;
  }

  return (
    <div className="source-list">
      <strong>{sources.length === 1 ? "Source" : "Sources"}</strong>
      <ul>
        {sources.map((source) => (
          <li key={`${source.name}-${source.url}`}>
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

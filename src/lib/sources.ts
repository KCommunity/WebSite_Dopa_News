import type { Article, ArticleSource } from "./types";

export function createArticleSource(params: {
  name: string;
  url: string;
  id?: string;
  reliability?: number;
}): ArticleSource {
  return {
    id: params.id,
    name: params.name.trim() || "Unknown source",
    url: params.url.trim(),
    reliability: params.reliability,
  };
}

export function getArticleSources(article: Article): ArticleSource[] {
  if (article.sources?.length) {
    return article.sources;
  }

  if (article.sourceUrl || article.sourceName) {
    return [
      createArticleSource({
        id: article.sourceId,
        name: article.sourceName,
        url: article.sourceUrl,
      }),
    ];
  }

  return [];
}

export function mergeArticleSources(
  existing: ArticleSource[],
  incoming: ArticleSource[],
): ArticleSource[] {
  const merged = [...existing];

  for (const source of incoming) {
    const duplicate = merged.some(
      (item) =>
        item.url === source.url ||
        (item.name.toLowerCase() === source.name.toLowerCase() &&
          item.url.replace(/\/$/, "") === source.url.replace(/\/$/, "")),
    );
    if (!duplicate && source.url) {
      merged.push(source);
    }
  }

  return merged;
}

export function applyPrimarySource(article: Article, sources: ArticleSource[]): Article {
  const primary = sources[0];
  return {
    ...article,
    sources,
    sourceId: primary?.id ?? article.sourceId ?? "unknown",
    sourceName: primary?.name ?? article.sourceName ?? "Unknown source",
    sourceUrl: primary?.url ?? article.sourceUrl ?? "",
  };
}

export function sourceLabel(sources: ArticleSource[]): string {
  if (sources.length === 0) return "No source";
  if (sources.length === 1) return sources[0].name;
  return `${sources[0].name} + ${sources.length - 1} more`;
}

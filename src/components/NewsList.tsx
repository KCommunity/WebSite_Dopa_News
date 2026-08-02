import Link from "next/link";
import type { Article } from "@/lib/types";
import { getCategoryName } from "@/lib/taxonomy";
import { formatDate } from "@/lib/format";

export function NewsList({ articles }: { articles: Article[] }) {
  if (articles.length === 0) {
    return <p className="empty-state">No published stories yet.</p>;
  }

  return (
    <ul className="news-list">
      {articles.map((article) => (
        <li key={article.id}>
          <Link href={`/news/${article.slug}`} className="news-row">
            <div className="news-row-meta">
              <span>{getCategoryName(article.category)}</span>
              <span>{formatDate(article.publishedAt ?? article.collectedAt)}</span>
            </div>
            <h3>{article.title}</h3>
            <p>{article.summary}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

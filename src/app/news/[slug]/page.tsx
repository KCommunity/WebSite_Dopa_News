import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatDate } from "@/lib/format";
import { getArticleBySlug, listPublishedArticles } from "@/lib/store";
import { getCategoryName } from "@/lib/taxonomy";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article || article.status !== "published") {
    return { title: "Story not found" };
  }
  return {
    title: article.title,
    description: article.summary,
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article || article.status !== "published") notFound();

  const related = (await listPublishedArticles())
    .filter((item) => item.category === article.category && item.id !== article.id)
    .slice(0, 3);

  return (
    <article className="article-page">
      <div className="shell">
        <div className="article-kicker">
          <span>{getCategoryName(article.category)}</span>
          <span>{formatDate(article.publishedAt)}</span>
          <span>Impact {article.impactScore}</span>
        </div>
        <h1>{article.title}</h1>
        <p className="article-summary">{article.summary}</p>
        <div className="article-body">
          <p>{article.body}</p>
        </div>
        <div className="explain-box">
          <strong>Why this story</strong>
          <p>{article.explainability}</p>
          <p>
            Source:{" "}
            <a href={article.sourceUrl} target="_blank" rel="noreferrer">
              {article.sourceName}
            </a>
          </p>
        </div>
        {related.length > 0 ? (
          <section className="section" style={{ paddingBottom: 0 }}>
            <div className="section-head">
              <h2>More in {getCategoryName(article.category)}</h2>
            </div>
            <ul className="news-list">
              {related.map((item) => (
                <li key={item.id}>
                  <a href={`/news/${item.slug}`} className="news-row">
                    <h3>{item.title}</h3>
                    <p>{item.summary}</p>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </article>
  );
}

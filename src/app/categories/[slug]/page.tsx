import { notFound } from "next/navigation";
import { NewsList } from "@/components/NewsList";
import { listPublishedArticles } from "@/lib/store";
import { getCategory } from "@/lib/taxonomy";
import type { CategorySlug } from "@/lib/types";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = getCategory(slug as CategorySlug);
  if (!category) notFound();

  const articles = (await listPublishedArticles()).filter(
    (article) => article.category === category.slug,
  );

  return (
    <section className="page-block">
      <div className="shell">
        <div className="section-head">
          <h1 className="page-title">{category.name}</h1>
          <p className="lede">{category.description}</p>
        </div>
        <NewsList articles={articles} />
      </div>
    </section>
  );
}

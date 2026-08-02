import Link from "next/link";
import { TAXONOMY } from "@/lib/taxonomy";

export const metadata = {
  title: "Categories",
};

export default function CategoriesPage() {
  return (
    <section className="page-block">
      <div className="shell">
        <div className="section-head">
          <h1 className="page-title">Categories</h1>
          <p className="lede">
            A living taxonomy of progress — from medicine and clean energy to
            community care and peace.
          </p>
        </div>
        <div className="category-grid">
          {TAXONOMY.map((category) => (
            <Link
              key={category.slug}
              href={`/categories/${category.slug}`}
              className="category-link"
            >
              <h3>{category.name}</h3>
              <p>{category.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

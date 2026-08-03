import Image from "next/image";
import Link from "next/link";
import { NewsList } from "@/components/NewsList";
import { listPublishedArticles } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const articles = await listPublishedArticles();
  const featured = articles.find((article) => article.featured) ?? articles[0];
  const latest = articles.filter((article) => article.id !== featured?.id).slice(0, 5);

  return (
    <>
      <section className="hero">
        <div className="hero-media" aria-hidden>
          <Image
            src="https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=2200&q=80"
            alt=""
            fill
            priority
            sizes="100vw"
          />
          <div className="hero-veil" />
        </div>
        <div className="shell hero-content">
          <h1 className="hero-brand">Dopa News</h1>
          <p className="hero-lead">
            Your daily good news — recent stories of personal triumph, health
            wins, happy endings, family joy, and new energy. Never published
            without editorial approval.
          </p>
          <div className="cta-row">
            <Link href="/news" className="button">
              Read the latest
            </Link>
            <Link href="/about" className="button secondary">
              Our mission
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="shell">
          <div className="section-head">
            <h2>{featured ? "Featured today" : "Latest good news"}</h2>
            <p>
              Every story below has been reviewed by a human editor. AI
              assistants help gather and prepare — people decide what goes live.
            </p>
          </div>
          {featured ? (
            <Link href={`/news/${featured.slug}`} className="news-row" style={{ borderTop: "none" }}>
              <div className="news-row-meta">
                <span>Featured</span>
                <span>{featured.country ?? "World"}</span>
              </div>
              <h3>{featured.title}</h3>
              <p>{featured.summary}</p>
            </Link>
          ) : null}
          <NewsList articles={latest} />
        </div>
      </section>
    </>
  );
}

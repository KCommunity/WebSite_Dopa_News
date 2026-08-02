import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <div>
          <p className="footer-brand">Dopa News</p>
          <p className="footer-copy">
            Your daily good news — credible progress, easier to find.
          </p>
        </div>
        <div className="footer-links">
          <Link href="/about">About</Link>
          <Link href="/news">Latest news</Link>
          <Link href="/admin/news">Editorial desk</Link>
        </div>
      </div>
    </footer>
  );
}

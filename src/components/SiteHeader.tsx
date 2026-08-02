import Link from "next/link";

const links = [
  { href: "/news", label: "Latest" },
  { href: "/categories", label: "Categories" },
  { href: "/search", label: "Search" },
  { href: "/about", label: "About" },
];

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand-mark" aria-label="Dopa News home">
          <span className="brand-dot" aria-hidden />
          Dopa News
        </Link>
        <nav className="site-nav" aria-label="Primary">
          {links.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
          <Link href="/admin" className="nav-admin">
            Editorial
          </Link>
        </nav>
      </div>
    </header>
  );
}

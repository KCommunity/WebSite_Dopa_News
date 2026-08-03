import Link from "next/link";

export type AdminSection = "add" | "review" | "sources";

const LINKS: Array<{ id: AdminSection; href: string; label: string }> = [
  { id: "add", href: "/admin/add", label: "Add News" },
  { id: "review", href: "/admin/review", label: "Review News" },
  { id: "sources", href: "/admin/sources", label: "Manage News Source" },
];

export function AdminNav({ active }: { active: AdminSection }) {
  return (
    <nav className="admin-subnav" aria-label="Editorial sections">
      {LINKS.map((link) => (
        <Link
          key={link.id}
          href={link.href}
          className={
            active === link.id ? "admin-subnav-link active" : "admin-subnav-link"
          }
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

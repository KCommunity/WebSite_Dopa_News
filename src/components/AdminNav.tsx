import Link from "next/link";

export function AdminNav({ active }: { active: "news" | "sources" }) {
  return (
    <nav className="admin-subnav" aria-label="Editorial sections">
      <Link
        href="/admin/news"
        className={active === "news" ? "admin-subnav-link active" : "admin-subnav-link"}
      >
        News
      </Link>
      <Link
        href="/admin/sources"
        className={
          active === "sources" ? "admin-subnav-link active" : "admin-subnav-link"
        }
      >
        Sources
      </Link>
    </nav>
  );
}

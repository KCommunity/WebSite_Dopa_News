import { AdminNav } from "@/components/AdminNav";

export function AdminShell({
  title,
  lede,
  active,
  children,
  notice,
}: {
  title: string;
  lede: string;
  active: "news" | "sources";
  children: React.ReactNode;
  notice?: React.ReactNode;
}) {
  return (
    <section className="admin-page">
      <div className="shell">
        <div className="section-head">
          <p className="admin-kicker">Editorial desk</p>
          <h1 className="page-title">{title}</h1>
          <p className="lede">{lede}</p>
          <AdminNav active={active} />
          {notice}
        </div>
        {children}
      </div>
    </section>
  );
}

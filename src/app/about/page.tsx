export const metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <section className="page-block">
      <div className="shell" style={{ maxWidth: "720px" }}>
        <div className="section-head">
          <h1 className="page-title">About Dopa News</h1>
          <p className="lede">
            Your daily good news — recent human stories that lift people up.
          </p>
        </div>
        <div className="article-body">
          <p>
            Dopa News (dopa.news) is the public face of the Good News Platform.
            We collect very recent stories from newspapers and news sites:
            personal triumph, winning against health problems, happy endings,
            happy family stories, and new energy. AI assistants help prepare
            candidates; humans approve what goes live.
          </p>
          <p>
            We are not here to publish every cheerful headline. We look for
            credible, timely stories with real human warmth or progress — and we
            reject sensationalism, propaganda, and unverified claims.
          </p>
          <p>
            AI assistants help with collection and enrichment. Editors remain
            responsible for what reaches readers.
          </p>
        </div>
      </div>
    </section>
  );
}

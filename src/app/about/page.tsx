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
            Your daily good news. Make people happier by making positive news
            easier to discover.
          </p>
        </div>
        <div className="article-body">
          <p>
            Dopa News (dopa.news) is the public face of the Good News Knowledge
            Platform. We collect inspiring, credible stories of progress from
            around the world, prepare them with AI assistance, and publish only
            after human editorial approval.
          </p>
          <p>
            We are not here to publish every cheerful headline. We look for
            stories that demonstrate real improvement — in health, science,
            education, environment, community, peace, and more — while rejecting
            sensationalism, propaganda, and unverified claims.
          </p>
          <p>
            Hermes coordinates collection and enrichment. Editors remain
            responsible for what reaches readers.
          </p>
        </div>
      </div>
    </section>
  );
}

export function ProductPage() {
  return (
    <main id="main-content">
      <section className="page-hero container product-hero">
        <h1>From first contact to closed deal.</h1>
        <p className="lead">
          Keep leads, deal stages and sales results in one workspace.
        </p>
        <div className="actions">
          <a className="button" href="/contact">
            Request access
          </a>
          <a className="button button-secondary" href="/app">
            Open workspace
          </a>
        </div>
        <figure className="product-figure">
          <picture>
            <source
              media="(max-width:60rem)"
              srcSet="/product/pipeline-detail.png"
            />
            <img
              src="/product/pipeline.png"
              alt="GlassCRM pipeline with example deals arranged across six sales stages"
              width="1536"
              height="372"
            />
          </picture>
          <figcaption>The sales pipeline, shown with example data.</figcaption>
        </figure>
      </section>

      <section className="section container" aria-labelledby="workflow-heading">
        <div className="section-heading">
          <h2 id="workflow-heading">Capture, qualify and move the deal.</h2>
          <p>
            Start with a contact. Add the opportunity. Keep its progress
            visible.
          </p>
        </div>
        <dl className="workflow-list">
          <div>
            <dt>Keep the details together</dt>
            <dd>
              Save contact details, qualification status and value. Search by
              name, company or email.
            </dd>
          </div>
          <div>
            <dt>Move the conversation forward</dt>
            <dd>
              Link a lead to a deal. Set its value and probability, then move it
              through six stages.
            </dd>
          </div>
          <div>
            <dt>Take a focused view</dt>
            <dd>
              Filter by status. Browse twenty leads per page or export your
              filtered list as CSV.
            </dd>
          </div>
        </dl>
      </section>

      <section className="section section-soft" aria-labelledby="leads-heading">
        <div className="container">
          <div className="section-heading">
            <h2 id="leads-heading">The record behind every opportunity.</h2>
            <p>
              Your lead list keeps contact details and qualification status
              within reach.
            </p>
          </div>
          <figure className="product-figure">
            <picture>
              <source
                media="(max-width:60rem)"
                srcSet="/product/lead-detail.png"
              />
              <img
                src="/product/leads.png"
                alt="GlassCRM lead table showing example contacts, companies, statuses and values"
                width="1440"
                height="900"
                loading="lazy"
              />
            </picture>
            <figcaption>
              The lead list and record editor, shown with example data.
            </figcaption>
          </figure>
        </div>
      </section>

      <section
        className="section section-dark"
        aria-labelledby="reporting-heading"
      >
        <div className="container">
          <div className="section-heading">
            <h2 id="reporting-heading">Report closed deals by period.</h2>
            <p>
              The overview brings won deal value, active leads, open deals and
              win rate together.
            </p>
          </div>
          <figure className="product-figure reporting-figure">
            <img
              src="/product/overview.png"
              width="1184"
              height="927"
              loading="lazy"
              alt="GlassCRM overview with deal values, lead counts and reporting charts using example data"
            />
            <figcaption>Sales reporting, shown with example data.</figcaption>
          </figure>
        </div>
      </section>

      <section
        className="section container questions"
        aria-labelledby="questions-heading"
      >
        <h2 id="questions-heading">A few practical details.</h2>
        <details>
          <summary>Can I choose a light or dark workspace?</summary>
          <p>
            Yes. Save a light, dark or system appearance in workspace settings.
          </p>
        </details>
        <details>
          <summary>How do I get access?</summary>
          <p>
            GlassCRM is in private preview. Contact us to discuss access.
            Existing users can open their workspace directly.
          </p>
        </details>
      </section>

      <section className="section section-soft closing">
        <div className="container">
          <h2>Start with your lead workflow.</h2>
          <a className="button" href="/contact">
            Request access
          </a>
        </div>
      </section>
    </main>
  );
}

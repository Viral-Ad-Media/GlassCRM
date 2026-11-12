export function HomePage() {
  return (
    <main id="main-content">
      <section className="home-hero container" aria-labelledby="home-title">
        <h1 id="home-title">
          Six stages.
          <br />
          One clear pipeline.
        </h1>
        <div className="hero-intro">
          <p className="lead">
            Keep leads, deals and sales progress in one focused workspace.
          </p>
          <div className="actions">
            <a className="button" href="/contact">
              Request access
            </a>
            <a className="button button-secondary" href="/product">
              See the product
            </a>
          </div>
        </div>
        <figure className="hero-product">
          <div>
            <picture>
              <source
                media="(max-width: 60rem)"
                srcSet="/product/pipeline-detail.png"
              />
              <img
                src="/product/pipeline.png"
                width="1536"
                height="372"
                alt="GlassCRM pipeline showing example deals and a Stage selector"
                fetchPriority="high"
              />
            </picture>
          </div>
          <figcaption>
            The GlassCRM pipeline, shown with example records.
          </figcaption>
        </figure>
      </section>
      <section className="section container">
        <div className="section-heading">
          <h2>A contact becomes an opportunity.</h2>
          <p>Follow the record from first conversation to a decision.</p>
        </div>
        <dl className="workflow-list">
          <div>
            <dt>Start with the person</dt>
            <dd>
              Keep their company, email, status and value in a searchable lead
              record.
            </dd>
          </div>
          <div>
            <dt>Give the deal a direction</dt>
            <dd>
              Link a deal to its lead. Set a value and probability, then move it
              through New, Qualified, Proposal, Negotiation, Won or Lost.
            </dd>
          </div>
          <div>
            <dt>Keep the next move visible</dt>
            <dd>
              Drag a deal between stages or use its Stage selector. The same
              workspace keeps the contact details close.
            </dd>
          </div>
        </dl>
        <div className="actions">
          <a className="text-link" href="/product">
            Explore the workflow
          </a>
        </div>
      </section>
      <section className="section section-dark">
        <div className="container">
          <div className="section-heading">
            <h2>A practical view of your sales.</h2>
            <p>Read sales results without losing the details.</p>
          </div>
          <figure className="product-figure reporting-figure">
            <img
              src="/product/overview.png"
              width="1184"
              height="927"
              loading="lazy"
              alt="GlassCRM overview showing reporting periods, current lead and deal totals, and charts with example data"
            />
            <figcaption>Sales reporting, shown with example data.</figcaption>
          </figure>
        </div>
      </section>
      <section className="section container questions">
        <h2>Before you get started.</h2>
        <details>
          <summary>Is GlassCRM open for signup?</summary>
          <p>
            GlassCRM is in private preview. Request access to discuss your
            workflow. Existing administrators can <a href="/app">sign in</a>.
          </p>
        </details>
        <details>
          <summary>Can I use it with multiple workspaces?</summary>
          <p>
            The current product has one administrator workspace. Public signup,
            tenant isolation and team roles are still to come.
          </p>
        </details>
        <details>
          <summary>Where can I find pricing?</summary>
          <p>
            Public plans have not been set. The <a href="/pricing">pricing</a>{" "}
            explains the current preview and how access works.
          </p>
        </details>
      </section>
      <section className="section section-soft">
        <div className="container closing">
          <p>Make room for a clearer sales day.</p>
          <a className="button" href="/contact">
            Request access
          </a>
        </div>
      </section>
    </main>
  );
}

export function PricingPage() {
  return (
    <main id="main-content" className="pricing-page">
      <section className="page-hero container">
        <h1>Pricing is still taking shape.</h1>
        <p className="lead">
          Explore the workspace while public plans take shape.
        </p>
        <div className="actions">
          <a className="button" href="/contact">
            Request access
          </a>
          <a className="button button-secondary" href="/app">
            Open workspace
          </a>
        </div>
      </section>

      <section
        className="section section-soft"
        aria-labelledby="preview-heading"
      >
        <div className="container pricing-access">
          <h2 id="preview-heading">
            Private preview.
            <br />
            One focused workspace.
          </h2>
          <div>
            <p className="lead">GlassCRM is currently available by request.</p>
            <p>Public plans are not set. Ask about access.</p>
            <p>
              Pricing and limits will be published before purchase is available.
            </p>
          </div>
        </div>
      </section>

      <section className="section container" aria-labelledby="included-heading">
        <div className="section-heading">
          <h2 id="included-heading">Inside the current workspace</h2>
          <p>
            The preview brings the core sales workflow together in one place.
          </p>
        </div>
        <dl className="workflow-list">
          <div>
            <dt>Leads</dt>
            <dd>Search, qualify and export your leads.</dd>
          </div>
          <div>
            <dt>Pipeline</dt>
            <dd>
              Move deals through six stages with values and probabilities.
            </dd>
          </div>
          <div>
            <dt>Overview</dt>
            <dd>Review sales results over a selected reporting period.</dd>
          </div>
        </dl>
        <a className="text-link pricing-product-link" href="/product">
          See the product in detail
        </a>
      </section>

      <section
        className="section section-soft"
        aria-labelledby="pricing-questions"
      >
        <div className="container">
          <h2 id="pricing-questions">Before you request access</h2>
          <div className="questions">
            <details>
              <summary>Do I need a credit card?</summary>
              <p>
                No. The current preview does not collect credit card details or
                process payments.
              </p>
            </details>
            <details>
              <summary>Can I create multiple workspaces?</summary>
              <p>
                The current product supports a single workspace. Public signup
                and multiple workspace creation are not available.
              </p>
            </details>
            <details>
              <summary>What happens after I request access?</summary>
              <p>
                Your request starts a conversation about your needs and the
                current preview. It does not create an account or start a
                subscription.
              </p>
            </details>
          </div>
        </div>
      </section>
    </main>
  );
}

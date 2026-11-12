const inquiryHref =
  "mailto:viraladmediacontent@gmail.com?subject=GlassCRM%20private%20preview&body=Hello%20GlassCRM%2C%0A%0AI%27d%20like%20to%20ask%20about%20the%20private%20preview.%0A%0ATeam%3A%20%0ACurrent%20sales%20workflow%3A%20%0AWhat%20we%27d%20like%20to%20improve%3A%20%0A";

export function ContactPage() {
  return (
    <main id="main-content">
      <section className="page-hero">
        <div className="container">
          <h1>Let’s talk about your sales workflow.</h1>
          <p className="lead">
            Tell us how your team works and what gets in the way.
          </p>
          <div className="actions">
            <a className="button" href={inquiryHref}>
              Write to GlassCRM
            </a>
            <a className="button button-secondary" href="/product">
              Take the product tour
            </a>
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <div className="section-heading">
            <h2>A useful place to start.</h2>
            <p>A short note is enough. These questions can help.</p>
          </div>
          <ol className="workflow-list">
            <li>
              <h3>Who handles your sales?</h3>
              <p>Introduce your team.</p>
            </li>
            <li>
              <h3>How do you manage follow-ups?</h3>
              <p>Describe your current tools.</p>
            </li>
            <li>
              <h3>What would you like to improve?</h3>
              <p>Name what gets in the way.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <h2>Before you write.</h2>
          </div>
          <div className="questions">
            <details>
              <summary>Can I sign up today?</summary>
              <p>
                Private preview supports one workspace. Public signup and
                support for multiple workspaces are still in development.
              </p>
            </details>
            <details>
              <summary>What happens when I click the email button?</summary>
              <p>Your email app opens a draft. You decide when to send it.</p>
            </details>
            <details>
              <summary>Already have an account?</summary>
              <p>
                <a className="text-link" href="/app">
                  Open your workspace
                </a>{" "}
                to continue.
              </p>
            </details>
          </div>
        </div>
      </section>

      <section className="section closing">
        <div className="container">
          <h2>Start with an email.</h2>
          <p>Prefer to write from your inbox?</p>
          <a className="text-link" href="mailto:viraladmediacontent@gmail.com">
            viraladmediacontent@gmail.com
          </a>
        </div>
      </section>
    </main>
  );
}

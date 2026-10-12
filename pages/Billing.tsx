export default function Billing() {
  return (
    <section className="max-w-3xl space-y-5">
      <h2 className="text-2xl font-semibold">Workspace capabilities</h2>
      <div className="card space-y-4">
        <p>
          This self-hosted installation provides one administrator workspace
          with leads, deals, reporting, CSV export, saved settings, and a recent
          activity log.
        </p>
        <p>
          There is no subscription or checkout in this application. Lead and
          pipeline plan limits are not imposed.
        </p>
        <p>
          Email delivery, team memberships, SSO/SAML, and managed support are
          not included. A payment or email provider must be integrated before
          offering those services.
        </p>
      </div>
    </section>
  );
}

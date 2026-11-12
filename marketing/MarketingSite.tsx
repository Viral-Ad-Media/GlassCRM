import { PanelsTopLeft } from "lucide-react";
import { HomePage } from "./Home";
import { ProductPage } from "./Product";
import { PricingPage } from "./Pricing";
import { ContactPage } from "./Contact";
export type MarketingRoute = "/" | "/product" | "/pricing" | "/contact";
export const marketingMetadata: Record<
  MarketingRoute,
  { title: string; description: string }
> = {
  "/": {
    title: "GlassCRM | Six stages. One clear pipeline.",
    description:
      "A focused CRM for leads, deals and sales progress. Explore the product and request private-preview access.",
  },
  "/product": {
    title: "Product | GlassCRM",
    description:
      "See how GlassCRM connects lead management, a six-stage sales pipeline and reporting in one focused workspace.",
  },
  "/pricing": {
    title: "Pricing and private-preview access | GlassCRM",
    description:
      "Explore what is available in the GlassCRM private preview, including current features and how to request access.",
  },
  "/contact": {
    title: "Contact GlassCRM | Request preview access",
    description:
      "Tell GlassCRM about your sales workflow and request a conversation about private-preview access.",
  },
};
const links = [
  ["/product", "Product"],
  ["/pricing", "Pricing"],
  ["/contact", "Contact"],
] as const;
function Nav({ route }: { route: MarketingRoute }) {
  return (
    <>
      {links.map(([href, label]) => (
        <a
          href={href}
          key={href}
          aria-current={route === href ? "page" : undefined}
        >
          {label}
        </a>
      ))}
      <a className="workspace-link" href="/app">
        Open workspace
      </a>
    </>
  );
}
export function MarketingSite({ route }: { route: MarketingRoute }) {
  const Page =
    route === "/product"
      ? ProductPage
      : route === "/pricing"
        ? PricingPage
        : route === "/contact"
          ? ContactPage
          : HomePage;
  return (
    <>
      <a className="skip-link button" href="#main-content">
        Skip to content
      </a>
      <header className="site-header container">
        <a className="brand" href="/" aria-label="GlassCRM home">
          <PanelsTopLeft size={24} strokeWidth={1.5} aria-hidden="true" />
          GlassCRM
        </a>
        <nav className="site-nav" aria-label="Main navigation">
          <Nav route={route} />
        </nav>
        <details className="mobile-navigation">
          <summary>Menu</summary>
          <nav aria-label="Mobile navigation">
            <Nav route={route} />
          </nav>
        </details>
      </header>
      <Page />
      <footer className="site-footer">
        <div className="container">
          <div className="footer-top">
            <p className="footer-signoff">Make the next conversation count.</p>
            <nav className="footer-links" aria-label="Footer">
              <a href="/product">Product</a>
              <a href="/pricing">Pricing</a>
              <a href="/contact">Contact</a>
              <a href="/app">Sign in</a>
            </nav>
          </div>
          <div className="footer-base">
            <p>GlassCRM by Viral Ad Media</p>
            <p>Currently in private preview.</p>
          </div>
        </div>
      </footer>
    </>
  );
}

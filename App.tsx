import { lazy, Suspense, useState } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { WorkspaceProvider } from "./workspace";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Pipeline = lazy(() => import("./pages/Pipeline"));
const Leads = lazy(() => import("./pages/Leads"));
const Settings = lazy(() => import("./pages/Settings"));
const Billing = lazy(() => import("./pages/Billing"));
export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <HashRouter>
      <WorkspaceProvider>
        <div className="min-h-screen">
          <a
            className="sr-only focus:not-sr-only focus:fixed focus:z-50 btn"
            href="#main"
            onClick={(event) => {
              event.preventDefault();
              document.getElementById("main")?.focus();
            }}
          >
            Skip to content
          </a>
          <Sidebar open={menuOpen} close={() => setMenuOpen(false)} />
          <div className="md:ml-64">
            <Header openMenu={() => setMenuOpen(true)} />
            <main id="main" tabIndex={-1} className="p-4 sm:p-8">
              <Suspense fallback={<p role="status">Loading page…</p>}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/pipeline" element={<Pipeline />} />
                  <Route path="/leads" element={<Leads />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/billing" element={<Billing />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </main>
          </div>
        </div>
      </WorkspaceProvider>
    </HashRouter>
  );
}

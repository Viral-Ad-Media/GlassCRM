import { NavLink } from "react-router-dom";
import { useWorkspace } from "../workspace";
import { useState, useEffect, useRef } from "react";
export function Sidebar({ open, close }: { open: boolean; close: () => void }) {
  const { logout } = useWorkspace();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const aside = useRef<HTMLElement>(null);
  const [small, setSmall] = useState(
    () => window.matchMedia("(max-width: 767px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setSmall(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!open) return;
    aside.current?.querySelector<HTMLElement>("button")?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        document.getElementById("open-navigation")?.focus();
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open, close]);
  return (
    <>
      {open && (
        <button
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          aria-label="Close navigation"
          onClick={close}
        />
      )}
      <aside
        ref={aside}
        inert={small && !open}
        id="workspace-navigation"
        aria-label="Workspace navigation"
        className={`fixed inset-y-0 left-0 w-64 card rounded-none z-40 flex flex-col transition-transform ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        <div className="flex justify-between">
          <span className="text-xl font-bold">GlassCRM</span>
          <button
            className="md:hidden"
            onClick={close}
            aria-label="Close navigation"
          >
            ✕
          </button>
        </div>
        <nav className="flex-1 space-y-2 mt-8">
          {[
            ["/", "Dashboard"],
            ["/pipeline", "Pipeline"],
            ["/leads", "Leads"],
            ["/billing", "Capabilities"],
            ["/settings", "Settings"],
          ].map(([path, label]) => (
            <NavLink
              key={path}
              to={path!}
              end
              onClick={close}
              className={({ isActive }) =>
                `block p-3 rounded ${isActive ? "bg-slate-200 dark:bg-slate-700 font-semibold" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button
          className="btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await logout();
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Sign out
        </button>
      </aside>
    </>
  );
}

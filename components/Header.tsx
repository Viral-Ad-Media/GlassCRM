import { useLocation, useNavigate } from "react-router-dom";
import { useWorkspace } from "../workspace";
export function Header({ openMenu }: { openMenu: () => void }) {
  const { data, email, search, setSearch } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-4 flex flex-wrap items-center gap-3">
      <button
        className="btn md:hidden"
        onClick={openMenu}
        id="open-navigation"
        aria-controls="workspace-navigation"
        aria-label="Open navigation"
      >
        ☰
      </button>
      <h1 className="font-semibold flex-1">{data.settings.workspaceName}</h1>
      <label className="w-full sm:w-60">
        Search leads and deals
        <input
          aria-label="Search leads and deals"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!["/leads", "/pipeline"].includes(location.pathname))
              navigate("/leads");
          }}
          type="search"
        />
      </label>
      <button
        className="btn"
        onClick={() => {
          setSearch("");
          navigate("/leads?new=1");
        }}
      >
        New lead
      </button>
      <details className="relative">
        <summary className="cursor-pointer">Activity</summary>
        <div className="absolute right-0 top-8 card w-72 max-h-80 overflow-y-auto shadow-xl">
          <p className="text-sm break-all">Signed in as {email}</p>
          <ul className="divide-y">
            {data.events.length ? (
              data.events.map((event) => (
                <li className="py-2 text-sm" key={event.id}>
                  {event.action}
                  <time className="block text-xs" dateTime={event.timestamp}>
                    {new Date(event.timestamp).toLocaleString()}
                  </time>
                </li>
              ))
            ) : (
              <li>No activity yet.</li>
            )}
          </ul>
        </div>
      </details>
    </header>
  );
}

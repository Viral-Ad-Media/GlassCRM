import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { defaultSettings, type Snapshot } from "./shared";
export async function api<T>(
  path: string,
  method = "GET",
  data?: unknown,
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method,
    credentials: "same-origin",
    headers: data === undefined ? {} : { "Content-Type": "application/json" },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    if (response.status === 401 && path !== "login")
      window.dispatchEvent(new Event("session-expired"));
    throw new Error(result.error ?? "Request failed");
  }
  return result;
}
type Context = {
  data: Snapshot;
  search: string;
  setSearch: (value: string) => void;
  mutate: (path: string, method: string, value?: unknown) => Promise<void>;
  email: string;
  logout: () => Promise<void>;
};
const Workspace = createContext<Context | null>(null);
export const useWorkspace = () => {
  const context = useContext(Workspace);
  if (!context) throw new Error("Workspace provider required");
  return context;
};
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [data, setData] = useState<Snapshot>({
    leads: [],
    deals: [],
    settings: defaultSettings,
    events: [],
  });
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    const expired = () => {
      setEmail(null);
      setData({ leads: [], deals: [], settings: defaultSettings, events: [] });
    };
    window.addEventListener("session-expired", expired);
    void (async () => {
      try {
        const session = await api<{ email: string }>("session");
        const snapshot = await api<Snapshot>("workspace");
        if (active) {
          setData(snapshot);
          setEmail(session.email);
        }
      } catch (e) {
        if (active && e instanceof Error && e.message !== "Please sign in")
          setError(e.message);
      } finally {
        if (active) setChecking(false);
      }
    })();
    return () => {
      active = false;
      window.removeEventListener("session-expired", expired);
    };
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () =>
      document.documentElement.classList.toggle(
        "dark",
        data.settings.appearance === "dark" ||
          (data.settings.appearance === "system" && media.matches),
      );
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [data.settings.appearance]);
  if (checking)
    return (
      <p role="status" className="p-8">
        Loading workspace…
      </p>
    );
  if (!email)
    return (
      <main className="min-h-screen grid place-items-center p-4">
        <form
          className="card w-full max-w-md space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            const form = new FormData(event.currentTarget);
            try {
              const session = await api<{ email: string }>("login", "POST", {
                email: form.get("email"),
                password: form.get("password"),
              });
              setData(await api<Snapshot>("workspace"));
              setEmail(session.email);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h1 className="text-2xl font-semibold">Sign in to GlassCRM</h1>
          <p>Use the workspace administrator account.</p>
          <label className="block">
            Email
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label className="block">
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button disabled={busy} className="btn">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </main>
    );
  return (
    <Workspace.Provider
      value={{
        data,
        email,
        search,
        setSearch,
        mutate: async (path, method, value) => {
          setData(await api<Snapshot>(path, method, value));
        },
        logout: async () => {
          await api("logout", "POST", {});
          setEmail(null);
          setSearch("");
          setData({
            leads: [],
            deals: [],
            settings: defaultSettings,
            events: [],
          });
        },
      }}
    >
      {children}
    </Workspace.Provider>
  );
}

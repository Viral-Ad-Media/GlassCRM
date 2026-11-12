import { authClient } from "./auth-client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { defaultSettings, type Snapshot, type SessionProfile } from "./shared";
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
  profile: SessionProfile;
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
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [showPassword, setShowPassword] = useState(false);
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
      setProfile(null);
      setData({ leads: [], deals: [], settings: defaultSettings, events: [] });
    };
    window.addEventListener("session-expired", expired);
    void (async () => {
      try {
        const session = await authClient.getSession();
        if (session.error)
          throw new Error(session.error.message ?? "Unable to check session");
        if (!session.data) return;
        const [snapshot, identity] = await Promise.all([
          api<Snapshot>("workspace"),
          api<SessionProfile>("session"),
        ]);
        if (active) {
          setData(snapshot);
          setProfile(identity);
          setEmail(session.data.user.email);
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
  if (!email || !profile)
    return (
      <main className="login-page min-h-screen grid place-items-center p-4">
        <form
          className="card w-full max-w-md space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError("");
            const form = new FormData(event.currentTarget);
            try {
              const session = await authClient.signIn.email({
                email: String(form.get("email")).trim().toLowerCase(),
                password: String(form.get("password")),
                rememberMe: form.get("rememberMe") === "on",
              });
              if (session.error)
                throw new Error(
                  session.error.message ?? "Invalid email or password",
                );
              if (!session.data) throw new Error("Sign in failed");
              const [snapshot, identity] = await Promise.all([
                api<Snapshot>("workspace"),
                api<SessionProfile>("session"),
              ]);
              setData(snapshot);
              setProfile(identity);
              setShowPassword(false);
              setEmail(session.data.user.email);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <a className="login-home" href="/">
            ← GlassCRM home
          </a>
          <h1 className="text-2xl font-semibold">Sign in to GlassCRM</h1>
          <p>
            Use the workspace administrator account. Access is currently by
            invitation.
          </p>
          <label className="block">
            Email
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <div>
            <label className="block" htmlFor="workspace-password">
              Password
            </label>
            <div className="password-control">
              <input
                id="workspace-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                aria-controls="workspace-password"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-3 min-h-11 cursor-pointer">
              <input
                type="checkbox"
                name="rememberMe"
                aria-describedby="remember-description"
              />
              Remember me
            </label>
            <p id="remember-description" className="text-sm">
              Stay signed in across browser restarts for up to 8 hours. Use only
              on a trusted device.
            </p>
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button disabled={busy} className="btn">
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-sm">
            <a className="underline" href="/contact">
              Need workspace access?
            </a>
          </p>
        </form>
      </main>
    );
  return (
    <Workspace.Provider
      value={{
        data,
        email,
        profile,
        search,
        setSearch,
        mutate: async (path, method, value) => {
          setData(await api<Snapshot>(path, method, value));
        },
        logout: async () => {
          const result = await authClient.signOut();
          if (result.error)
            throw new Error(result.error.message ?? "Sign out failed");
          setEmail(null);
          setProfile(null);
          setShowPassword(false);
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

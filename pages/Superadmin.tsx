import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, useWorkspace } from "../workspace";
import type { SuperadminOverview } from "../shared";

const roleLabel = {
  superadmin: "Superadmin",
  administrator: "Workspace administrator",
  none: "No workspace access",
};
const time = (value: string) => new Date(value).toLocaleString();
export default function Superadmin() {
  const { profile } = useWorkspace();
  const [data, setData] = useState<SuperadminOverview | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revoking, setRevoking] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        const result = await api<SuperadminOverview>(`superadmin?page=${page}`);
        if (!signal?.aborted) setData(result);
      } catch (e) {
        if (!signal?.aborted) setError((e as Error).message);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [page],
  );
  useEffect(() => {
    if (profile.role !== "superadmin") return;
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [profile.role, load]);
  if (profile.role !== "superadmin")
    return (
      <section className="card space-y-4">
        <h2 className="text-2xl font-semibold">Superadmin access required</h2>
        <p>This account can use the CRM but cannot manage platform access.</p>
        <Link to="/" className="btn btn-quiet">
          Return to dashboard
        </Link>
      </section>
    );
  return (
    <section className="space-y-6 min-w-0 w-full" aria-busy={loading}>
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div className="min-w-0 w-full sm:w-auto sm:flex-1">
          <h2 className="text-2xl font-semibold">Superadmin dashboard</h2>
          <p className="mt-2 break-words">
            Welcome, {profile.name}. Manage platform access and account
            security.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={() => void load()}
          disabled={loading || revoking !== null}
        >
          Refresh overview
        </button>
      </div>
      {error && (
        <p className="error" role="alert">
          {error} Try refreshing the overview.
        </p>
      )}
      {message && (
        <p className="card" role="status">
          {message}
        </p>
      )}
      {loading && !data && <p role="status">Loading platform overview…</p>}
      {data && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
            {[
              ["Users", data.totals.users],
              ["Superadmins", data.totals.superadmins],
              ["Active sessions", data.totals.activeSessions],
              ["Leads", data.totals.leads],
              ["Deals", data.totals.deals],
            ].map(([label, value]) => (
              <div className="card" key={label}>
                <h3 className="text-sm">{label}</h3>
                <p className="text-3xl font-semibold mt-3 tabular-nums">
                  {value}
                </p>
              </div>
            ))}
          </div>
          <div className="grid xl:grid-cols-2 gap-4">
            <section className="card space-y-4">
              <h3 className="text-lg font-semibold">Workspace health</h3>
              <dl className="admin-facts">
                <div>
                  <dt>Workspace</dt>
                  <dd>{data.workspace.name}</dd>
                </div>
                <div>
                  <dt>Database</dt>
                  <dd>Connected</dd>
                </div>
                <div>
                  <dt>Authentication</dt>
                  <dd>{data.health.authentication}</dd>
                </div>
                <div>
                  <dt>Access model</dt>
                  <dd>One administrator workspace</dd>
                </div>
              </dl>
              <p className="text-sm">
                Team workspaces and subscription billing are not enabled.
              </p>
              <Link to="/settings" className="underline">
                Manage workspace settings
              </Link>
            </section>
            <section className="card space-y-4">
              <h3 className="text-lg font-semibold">Access and security</h3>
              <p>
                Your superadmin role is checked on the server for every request.
                Accounts without workspace access remain restricted.
              </p>
              <p className="text-sm">
                Active sessions are unexpired server sessions. Revoke sessions
                to require a fresh sign-in; your current session is preserved.
              </p>
              <p className="text-sm">
                Last refreshed{" "}
                <time dateTime={data.generatedAt}>
                  {time(data.generatedAt)}
                </time>
              </p>
            </section>
          </div>
          <section className="card space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <h3 className="text-lg font-semibold">User directory</h3>
              <p className="text-sm">
                {data.totals.users} registered{" "}
                {data.totals.users === 1 ? "account" : "accounts"}
              </p>
            </div>
            <div
              className="overflow-x-auto"
              tabIndex={0}
              aria-label="Scrollable user directory"
            >
              <table className="w-full text-left">
                <caption className="sr-only">
                  Accounts, access roles and session controls
                </caption>
                <thead>
                  <tr>
                    {[
                      "Account",
                      "Access",
                      "Active sessions",
                      "Session activity",
                      "Action",
                    ].map((label) => (
                      <th scope="col" className="p-3" key={label}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((user) => (
                    <tr key={user.id} className="border-t border-line">
                      <td className="p-3">
                        <span className="font-semibold block">
                          {user.name}
                          {user.id === data.currentUserId ? " (you)" : ""}
                        </span>
                        <span className="block break-all">{user.email}</span>
                        <span className="block text-xs mt-1">
                          Joined {time(user.createdAt)}
                        </span>
                      </td>
                      <td className="p-3">{roleLabel[user.role]}</td>
                      <td className="p-3 tabular-nums">
                        {user.activeSessions}
                      </td>
                      <td className="p-3">
                        {user.lastActiveAt
                          ? time(user.lastActiveAt)
                          : "No active session"}
                      </td>
                      <td className="p-3 min-w-44">
                        {confirmId === user.id ? (
                          <div className="space-y-3">
                            <p className="text-sm">
                              Sign out {user.email} on{" "}
                              {user.id === data.currentUserId
                                ? "other devices"
                                : "all devices"}
                              ?
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                className="btn btn-danger"
                                disabled={revoking !== null}
                                onClick={async () => {
                                  setRevoking(user.id);
                                  setMessage("");
                                  setError("");
                                  try {
                                    const result = await api<{
                                      revoked: number;
                                    }>("superadmin/sessions/revoke", "POST", {
                                      userId: user.id,
                                    });
                                    setConfirmId(null);
                                    setMessage(
                                      `Revoked ${result.revoked} session${result.revoked === 1 ? "" : "s"}. ${user.id === data.currentUserId ? "Your current session is still active." : "The account must sign in again."}`,
                                    );
                                    await load();
                                  } catch (e) {
                                    setError((e as Error).message);
                                  } finally {
                                    setRevoking(null);
                                  }
                                }}
                              >
                                {revoking === user.id
                                  ? "Revoking…"
                                  : "Confirm revoke"}
                              </button>
                              <button
                                className="btn btn-quiet"
                                disabled={revoking !== null}
                                onClick={() => setConfirmId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="btn btn-quiet"
                            aria-label={`Revoke sessions for ${user.email}`}
                            disabled={
                              revoking !== null ||
                              loading ||
                              user.activeSessions <=
                                (user.id === data.currentUserId ? 1 : 0)
                            }
                            onClick={() => setConfirmId(user.id)}
                          >
                            {user.id === data.currentUserId
                              ? "Revoke other sessions"
                              : "Revoke sessions"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <button
                className="btn btn-quiet"
                disabled={loading || revoking !== null || data.userPage <= 1}
                onClick={() => {
                  setConfirmId(null);
                  setPage(data.userPage - 1);
                }}
              >
                Previous users
              </button>
              <p>
                Page {data.userPage} of {data.userPages}
              </p>
              <button
                className="btn btn-quiet"
                disabled={
                  loading ||
                  revoking !== null ||
                  data.userPage >= data.userPages
                }
                onClick={() => {
                  setConfirmId(null);
                  setPage(data.userPage + 1);
                }}
              >
                Next users
              </button>
            </div>
          </section>
          <section className="card space-y-4">
            <h3 className="text-lg font-semibold">Recent activity</h3>
            {data.events.length ? (
              <ol className="divide-y divide-line">
                {data.events.map((event) => (
                  <li key={event.id} className="py-3">
                    <p className="break-words">{event.action}</p>
                    <time className="text-sm" dateTime={event.timestamp}>
                      {time(event.timestamp)}
                    </time>
                  </li>
                ))}
              </ol>
            ) : (
              <p>No activity recorded yet.</p>
            )}
          </section>
        </>
      )}
    </section>
  );
}

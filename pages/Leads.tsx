import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useWorkspace } from "../workspace";
import { Editor } from "../components/Editor";
import { currency, type Lead } from "../shared";
export function csvCell(value: string | number) {
  const text = String(value);
  return `"${(/^[\s]*[=+\-@\t\r]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`;
}
export default function Leads() {
  const { data, search, mutate } = useWorkspace();
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<Lead | "new" | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get("new") === "1") {
      setEditor("new");
      setParams({}, { replace: true });
    }
  }, [params, setParams]);
  useEffect(() => {
    setPage(1);
  }, [search, status]);
  const filtered = data.leads.filter(
    (l) =>
      (status === "All" || l.status === status) &&
      `${l.name} ${l.company} ${l.email}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 20));
  const current = Math.min(page, pages);
  const exportCsv = () => {
    const rows = [
      ["Name", "Company", "Email", "Status", "Value (USD)"],
      ...filtered.map((l) => [l.name, l.company, l.email, l.status, l.value]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "glasscrm-leads.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold flex-1">Leads</h2>
        <button className="btn" onClick={() => setEditor("new")}>
          Add lead
        </button>
        <button className="btn" onClick={exportCsv} disabled={!filtered.length}>
          Export filtered leads
        </button>
      </div>
      <label className="block max-w-xs">
        Filter by status
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {["All", "New", "Contacted", "Qualified", "Unqualified"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full text-left">
          <caption className="sr-only">Workspace leads</caption>
          <thead>
            <tr>
              {["Name", "Company", "Status", "Value", "Email", "Actions"].map(
                (s) => (
                  <th scope="col" className="p-3" key={s}>
                    {s}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.slice((current - 1) * 20, current * 20).map((l) => (
              <tr
                key={l.id}
                className="border-t border-slate-200 dark:border-slate-700"
              >
                <td className="p-3">{l.name}</td>
                <td className="p-3">{l.company}</td>
                <td className="p-3">{l.status}</td>
                <td className="p-3 whitespace-nowrap">{currency(l.value)}</td>
                <td className="p-3">{l.email}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button
                      className="btn"
                      onClick={() => setEditor(l)}
                      aria-label={`Edit ${l.name}`}
                    >
                      Edit
                    </button>
                    <button
                      className="btn"
                      disabled={busy}
                      aria-label={`Delete ${l.name}`}
                      onClick={async () => {
                        if (
                          !confirm(`Delete ${l.name}? This cannot be undone.`)
                        )
                          return;
                        setError("");
                        setBusy(true);
                        try {
                          await mutate(`leads/${l.id}`, "DELETE");
                        } catch (e) {
                          setError((e as Error).message);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <p className="py-5">
            No leads match. Add a lead or change your search.
          </p>
        )}
      </div>
      <div className="flex items-center gap-4">
        <button
          className="btn"
          disabled={current === 1}
          onClick={() => setPage(current - 1)}
        >
          Previous
        </button>
        <span>
          Page {current} of {pages} · {filtered.length} leads
        </span>
        <button
          className="btn"
          disabled={current === pages}
          onClick={() => setPage(current + 1)}
        >
          Next
        </button>
      </div>
      {editor && (
        <Editor
          kind="leads"
          record={editor === "new" ? undefined : editor}
          close={() => setEditor(null)}
        />
      )}
    </section>
  );
}

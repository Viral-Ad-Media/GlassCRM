import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "../workspace";
import { stages, leadInput, dealInput, type Lead, type Deal } from "../shared";
export function Editor({
  kind,
  record,
  close,
}: {
  kind: "leads" | "deals";
  record?: Lead | Deal;
  close: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { data, mutate } = useWorkspace();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const lead = kind === "leads" ? (record as Lead | undefined) : undefined;
  const deal = kind === "deals" ? (record as Deal | undefined) : undefined;
  return (
    <dialog
      ref={dialog}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) close();
      }}
      aria-labelledby="editor-title"
      className="card w-[calc(100%-2rem)] max-w-lg max-h-[90vh] overflow-auto backdrop:bg-black/40"
    >
      <form
        className="space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setError("");
          const form = new FormData(event.currentTarget);
          const raw =
            kind === "leads"
              ? {
                  name: form.get("name"),
                  company: form.get("company"),
                  email: form.get("email"),
                  status: form.get("status"),
                  value: Number(form.get("value")),
                }
              : {
                  title: form.get("title"),
                  leadId: form.get("leadId"),
                  stageId: form.get("stageId"),
                  value: Number(form.get("value")),
                  probability: Number(form.get("probability")),
                };
          const parsed = (kind === "leads" ? leadInput : dealInput).safeParse(
            raw,
          );
          if (!parsed.success) {
            setError(parsed.error.issues.map((i) => i.message).join("; "));
            return;
          }
          setBusy(true);
          try {
            await mutate(
              `${kind}${record ? `/${record.id}` : ""}`,
              record ? "PUT" : "POST",
              parsed.data,
            );
            close();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 id="editor-title" className="text-xl font-semibold">
          {record ? "Edit" : "New"} {kind === "leads" ? "lead" : "deal"}
        </h2>
        <fieldset disabled={busy} className="space-y-3">
          {kind === "leads" ? (
            <>
              <label className="block">
                Name
                <input
                  name="name"
                  defaultValue={lead?.name}
                  required
                  maxLength={200}
                  autoFocus
                />
              </label>
              <label className="block">
                Company
                <input
                  name="company"
                  defaultValue={lead?.company}
                  required
                  maxLength={200}
                />
              </label>
              <label className="block">
                Email
                <input
                  type="email"
                  name="email"
                  defaultValue={lead?.email}
                  required
                  maxLength={254}
                />
              </label>
              <label className="block">
                Status
                <select name="status" defaultValue={lead?.status ?? "New"}>
                  {["New", "Contacted", "Qualified", "Unqualified"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <>
              <label className="block">
                Deal title
                <input
                  name="title"
                  defaultValue={deal?.title}
                  required
                  maxLength={200}
                  autoFocus
                />
              </label>
              <label className="block">
                Lead
                <select
                  aria-label="Lead"
                  name="leadId"
                  defaultValue={deal?.leadId ?? ""}
                  required
                >
                  <option value="" disabled>
                    Select a lead
                  </option>
                  {data.leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} — {l.company}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                Stage
                <select name="stageId" defaultValue={deal?.stageId ?? "new"}>
                  {stages.map((s) => (
                    <option value={s.id} key={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                Probability (%)
                <input
                  type="number"
                  name="probability"
                  min={0}
                  max={100}
                  step={1}
                  defaultValue={deal?.probability ?? 20}
                  required
                />
              </label>
            </>
          )}
          <label className="block">
            Value (USD)
            <input
              type="number"
              name="value"
              min={0}
              max={1e12}
              step="0.01"
              defaultValue={record?.value ?? 0}
              required
            />
          </label>
        </fieldset>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button className="btn" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
          <button className="btn" type="button" disabled={busy} onClick={close}>
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}

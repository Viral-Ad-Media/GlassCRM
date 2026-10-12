import { useState } from "react";
import { useWorkspace } from "../workspace";
import { settingsInput } from "../shared";
export default function Settings() {
  const { data, mutate } = useWorkspace();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="max-w-2xl space-y-5">
      <h2 className="text-2xl font-semibold">Settings</h2>
      <form
        className="card space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setMessage("");
          setError("");
          const form = new FormData(event.currentTarget);
          const parsed = settingsInput.safeParse({
            workspaceName: form.get("workspaceName"),
            supportEmail: form.get("supportEmail"),
            appearance: form.get("appearance"),
          });
          if (!parsed.success) {
            setError(parsed.error.issues.map((i) => i.message).join("; "));
            return;
          }
          setBusy(true);
          try {
            await mutate("settings", "PUT", parsed.data);
            setMessage("Changes saved");
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy} className="space-y-4">
          <label className="block">
            Workspace name
            <input
              name="workspaceName"
              required
              maxLength={200}
              defaultValue={data.settings.workspaceName}
            />
          </label>
          <label className="block">
            Support email
            <input
              type="email"
              name="supportEmail"
              maxLength={254}
              defaultValue={data.settings.supportEmail}
            />
          </label>
          <label className="block">
            Appearance
            <select name="appearance" defaultValue={data.settings.appearance}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </label>
        </fieldset>
        <p>
          Support email is stored as workspace information. This installation
          does not send email notifications.
        </p>
        <button className="btn" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </button>
        {message && <p role="status">{message}</p>}
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}

import { useState } from "react";
import { useWorkspace } from "../workspace";
import { currency, stages, type Deal, type DealInput } from "../shared";
import { Editor } from "../components/Editor";
export default function Pipeline() {
  const { data, search, mutate } = useWorkspace();
  const [editor, setEditor] = useState<Deal | "new" | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null);
  const move = async (deal: Deal, stageId: DealInput["stageId"]) => {
    if (busy || deal.stageId === stageId) return;
    setBusy(true);
    setError("");
    const { title, leadId, value, probability } = deal;
    try {
      await mutate(`deals/${deal.id}`, "PUT", {
        title,
        leadId,
        value,
        probability:
          stageId === "won" ? 100 : stageId === "lost" ? 0 : probability,
        stageId,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setDragged(null);
    }
  };
  return (
    <section className="space-y-5">
      <div className="flex gap-3 flex-wrap items-center">
        <h2 className="text-2xl font-semibold flex-1">Pipeline</h2>
        <button
          className="btn"
          disabled={!data.leads.length}
          onClick={() => setEditor("new")}
        >
          Add deal
        </button>
      </div>
      {!data.leads.length && <p>Add a lead before creating a deal.</p>}
      <p>Drag deals between stages or use each deal’s Stage selector.</p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <div className="overflow-x-auto pb-4" aria-label="Sales pipeline">
        <div className="flex gap-4 w-max">
          {stages.map((stage) => {
            const deals = data.deals.filter(
              (d) =>
                d.stageId === stage.id &&
                `${d.title} ${data.leads.find((l) => l.id === d.leadId)?.name ?? ""}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
            );
            return (
              <section
                key={stage.id}
                className="w-72 flex flex-col max-h-[70vh]"
                aria-label={`${stage.name} deals`}
                onDragOver={(e) => {
                  if (dragged && !busy) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain");
                  const deal = data.deals.find(
                    (d) => d.id === id && id === dragged,
                  );
                  if (deal) void move(deal, stage.id);
                  setDragged(null);
                }}
              >
                <h3 className="font-semibold">
                  {stage.name} ({deals.length})
                </h3>
                <p className="text-sm mb-3">
                  {currency(deals.reduce((sum, d) => sum + d.value, 0))}
                </p>
                <div className="space-y-3 overflow-y-auto flex-1 min-h-32 p-1">
                  {deals.map((deal) => (
                    <article
                      key={deal.id}
                      className="card space-y-3"
                      draggable={!busy}
                      onDragStart={(e) => {
                        setDragged(deal.id);
                        e.dataTransfer.setData("text/plain", deal.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setDragged(null)}
                    >
                      <h4 className="font-semibold break-words">
                        {deal.title}
                      </h4>
                      <p>
                        {currency(deal.value)} · {deal.probability}%
                      </p>
                      <p className="text-sm">
                        {data.leads.find((l) => l.id === deal.leadId)?.name}
                      </p>
                      <label className="block text-sm">
                        Stage for {deal.title}
                        <select
                          disabled={busy}
                          value={deal.stageId}
                          onChange={(e) =>
                            void move(
                              deal,
                              e.target.value as DealInput["stageId"],
                            )
                          }
                        >
                          {stages.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="flex gap-2">
                        <button
                          className="btn"
                          aria-label={`Edit ${deal.title}`}
                          onClick={() => setEditor(deal)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn"
                          disabled={busy}
                          aria-label={`Delete ${deal.title}`}
                          onClick={async () => {
                            if (
                              !confirm(
                                `Delete ${deal.title}? This cannot be undone.`,
                              )
                            )
                              return;
                            setBusy(true);
                            setError("");
                            try {
                              await mutate(`deals/${deal.id}`, "DELETE");
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
                    </article>
                  ))}
                  {!deals.length && <p className="card">No deals</p>}
                </div>
              </section>
            );
          })}
        </div>
      </div>
      {editor && (
        <Editor
          kind="deals"
          record={editor === "new" ? undefined : editor}
          close={() => setEditor(null)}
        />
      )}
    </section>
  );
}

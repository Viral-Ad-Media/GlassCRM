import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { useWorkspace } from "../workspace";
import { metrics, currency } from "../shared";
export default function Dashboard() {
  const { data } = useWorkspace();
  const [days, setDays] = useState(30);
  const summary = metrics(data.deals, days);
  const revenue = Array.from({ length: days }, (_, i) => {
    const date = new Date(Date.now() - (days - 1 - i) * 86400000)
      .toISOString()
      .slice(0, 10);
    return {
      date,
      value: data.deals
        .filter((d) => d.stageId === "won" && d.updatedAt.slice(0, 10) === date)
        .reduce((sum, d) => sum + d.value, 0),
    };
  });
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <h2 className="text-2xl font-semibold flex-1">Overview</h2>
        <label>
          Reporting period
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={365}>Last 365 days</option>
          </select>
        </label>
      </div>
      <p>
        Revenue and win rate use the most recent update of closed deals in the
        selected period. Open deals, leads, and stage counts describe the
        current workspace. Dates are grouped in UTC.
      </p>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          ["Won deal value", currency(summary.revenue)],
          [
            "Active leads",
            String(data.leads.filter((l) => l.status !== "Unqualified").length),
          ],
          ["Open deals", String(summary.open)],
          ["Win rate", `${summary.winRate}%`],
        ].map(([name, value]) => (
          <div className="card" key={name}>
            <h3>{name}</h3>
            <p className="text-3xl font-semibold mt-3">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid xl:grid-cols-2 gap-4">
        <section className="card">
          <h3 className="font-semibold">Won value by day (USD)</h3>
          <div className="h-80 mt-4 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue}>
                <XAxis dataKey="date" minTickGap={40} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <details>
            <summary>View revenue data</summary>
            <ul className="max-h-48 overflow-auto">
              {revenue.map((row) => (
                <li key={row.date}>
                  {row.date}: {currency(row.value)}
                </li>
              ))}
            </ul>
          </details>
        </section>
        <section className="card">
          <h3 className="font-semibold">Current pipeline volume</h3>
          <div className="h-80 mt-4 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.volume} layout="vertical">
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="#2563eb" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul>
            {summary.volume.map((row) => (
              <li key={row.name}>
                {row.name}: {row.value}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}

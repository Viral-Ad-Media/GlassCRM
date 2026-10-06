import { z } from "zod";
export const stageIds = [
  "new",
  "qualified",
  "proposal",
  "negotiation",
  "won",
  "lost",
] as const;
export const stages = stageIds.map((id) => ({
  id,
  name: id[0]!.toUpperCase() + id.slice(1),
}));
const text = z.string().trim().min(1).max(200);
export const leadInput = z
  .object({
    name: text,
    company: text,
    email: z.email().max(254),
    status: z.enum(["New", "Contacted", "Qualified", "Unqualified"]),
    value: z.number().finite().min(0).max(1e12),
  })
  .strict();
export const dealInput = z
  .object({
    leadId: z.string().uuid(),
    title: text,
    value: z.number().finite().min(0).max(1e12),
    stageId: z.enum(stageIds),
    probability: z.number().int().min(0).max(100),
  })
  .strict();
export const settingsInput = z
  .object({
    workspaceName: text,
    supportEmail: z.union([z.literal(""), z.email().max(254)]),
    appearance: z.enum(["light", "dark", "system"]),
  })
  .strict();
export type LeadInput = z.infer<typeof leadInput>;
export type DealInput = z.infer<typeof dealInput>;
export type Settings = z.infer<typeof settingsInput>;
export type Lead = LeadInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
export type Deal = DealInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
export type AuditEvent = { id: string; action: string; timestamp: string };
export type Snapshot = {
  leads: Lead[];
  deals: Deal[];
  settings: Settings;
  events: AuditEvent[];
};
export const defaultSettings: Settings = {
  workspaceName: "My Workspace",
  supportEmail: "",
  appearance: "system",
};
export const currency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
export function metrics(deals: Deal[], days: number, now = Date.now()) {
  const recent = deals.filter(
    (d) => Date.parse(d.updatedAt) >= now - days * 86400000,
  );
  const won = recent.filter((d) => d.stageId === "won");
  const closed = recent.filter(
    (d) => d.stageId === "won" || d.stageId === "lost",
  );
  return {
    revenue: won.reduce((sum, d) => sum + d.value, 0),
    open: deals.filter((d) => !["won", "lost"].includes(d.stageId)).length,
    winRate: closed.length ? Math.round((won.length / closed.length) * 100) : 0,
    volume: stages.map((s) => ({
      name: s.name,
      value: deals.filter((d) => d.stageId === s.id).length,
    })),
  };
}

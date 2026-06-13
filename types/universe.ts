export type UniverseModuleId = "ai-daily" | "quant-lab" | "game" | "photos" | "tools";

export type UniverseModuleTone = "red" | "blue" | "yellow" | "green" | "violet";

export type UniverseModuleStatus = "live" | "watch" | "quiet" | "building";

export type UniverseModule = {
  id: UniverseModuleId;
  eyebrow: string;
  title: string;
  path: string;
  status: UniverseModuleStatus;
  tone: UniverseModuleTone;
  summary: string;
  signal: string;
  actionLabel: string;
  focusHint: string;
  metricLabel: string;
  metricValue: string;
  secondaryMetric: string;
  orbit: {
    x: number;
    y: number;
    size: number;
  };
};

export type UniverseEvent = {
  id: string;
  moduleId: UniverseModuleId;
  title: string;
  description: string;
  occurredAt: string;
  href: string;
  kind: "dispatch" | "snapshot" | "memory" | "release" | "tool";
  impact: "high" | "medium" | "low";
  relatedModuleIds: UniverseModuleId[];
  nextAction: string;
};

export type UniverseMission = {
  id: string;
  moduleId: UniverseModuleId;
  title: string;
  detail: string;
  href: string;
  priority: "now" | "next" | "later";
  estimate: string;
  output: string;
};

export type UniverseConnection = {
  id: string;
  from: UniverseModuleId;
  to: UniverseModuleId;
  label: string;
  detail: string;
  strength: "primary" | "support" | "watch";
};

export type UniverseHealthItem = {
  label: string;
  value: string;
  detail: string;
  tone: "good" | "watch" | "muted";
};

export type UniverseObservatoryData = {
  updatedAt: string;
  modules: UniverseModule[];
  events: UniverseEvent[];
  missions: UniverseMission[];
  connections: UniverseConnection[];
  health: UniverseHealthItem[];
};

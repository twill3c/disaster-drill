import type { Scenario } from "@/core/types";

import { earthquake } from "./earthquake";
import { fire } from "./fire";
import { flood } from "./flood";
import { landslide } from "./landslide";
import { tsunami } from "./tsunami";

/** F-16 の 5 災害。難易度の低い順に並べる */
export const SCENARIOS: readonly Scenario[] = [
  earthquake,
  fire,
  flood,
  tsunami,
  landslide,
];

export function findScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export const DISASTER_LABEL: Record<string, string> = {
  earthquake: "地震",
  fire: "火災",
  flood: "洪水",
  tsunami: "津波",
  landslide: "土砂災害",
};

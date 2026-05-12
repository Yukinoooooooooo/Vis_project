import { fetchAllSources } from "../connectors";
import { buildSnapshot } from "./buildSnapshot";
import { writeSnapshot } from "./cache";
import type { RiskSnapshot } from "./types";

export async function refreshSnapshot(): Promise<RiskSnapshot> {
  const results = await fetchAllSources();
  const snapshot = buildSnapshot(results);
  await writeSnapshot(snapshot);
  return snapshot;
}


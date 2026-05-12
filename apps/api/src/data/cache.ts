import fs from "node:fs/promises";
import path from "node:path";
import { apiConfig } from "../config";
import type { RiskSnapshot } from "./types";
import { derivationPolicy } from "./derivationPolicy";

const latestSnapshotPath = path.join(apiConfig.cacheDir, "latest-snapshot.json");

export async function writeSnapshot(snapshot: RiskSnapshot): Promise<void> {
  await fs.mkdir(apiConfig.cacheDir, { recursive: true });
  await fs.writeFile(latestSnapshotPath, JSON.stringify(snapshot, null, 2), "utf-8");
}

export async function readSnapshot(): Promise<RiskSnapshot> {
  try {
    const raw = await fs.readFile(latestSnapshotPath, "utf-8");
    return JSON.parse(raw) as RiskSnapshot;
  } catch {
    return emptySnapshot();
  }
}

export function emptySnapshot(): RiskSnapshot {
  const generatedAt = new Date().toISOString();
  return {
    generatedAt,
    windowId: "w_latest_public",
    windowLabel: "最新公开快照",
    sources: [],
    notices: [
      {
        sourceName: "local-cache",
        message: "尚未生成真实数据快照。请运行 npm run data:refresh 或调用 POST /admin/data/refresh。",
        severity: "warning"
      }
    ],
    derivationPolicy,
    events: [],
    nodes: [],
    edges: [],
    exposures: [],
    evidenceCards: [],
    assessments: [],
    signals: [],
    watchItems: []
  };
}


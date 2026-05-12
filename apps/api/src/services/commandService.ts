import type { WatchItem, WatchTargetType } from "@risk-map/shared";
import { writeSnapshot } from "../data/cache";
import type { RiskSnapshot } from "../data/types";
import { ViewError } from "./viewService";

export async function addWatchItem(
  snapshot: RiskSnapshot,
  input: { targetType: WatchTargetType; targetId: string; targetName?: string; sourceUrl?: string }
): Promise<WatchItem> {
  const existing = snapshot.watchItems.find((item) => item.targetType === input.targetType && item.targetId === input.targetId);
  if (existing) return existing;

  const resolved = resolveTarget(snapshot, input);
  const item: WatchItem = {
    watchId: `watch_${input.targetType}_${input.targetId}`,
    targetType: input.targetType,
    targetId: input.targetId,
    targetName: input.targetName ?? resolved.targetName,
    status: "active",
    createdAt: new Date().toISOString(),
    latestSignal: resolved.latestSignal,
    sourceUrl: input.sourceUrl ?? resolved.sourceUrl
  };

  snapshot.watchItems.push(item);
  await writeSnapshot(snapshot);
  return item;
}

export async function removeWatchItem(snapshot: RiskSnapshot, watchId: string): Promise<void> {
  const index = snapshot.watchItems.findIndex((item) => item.watchId === watchId);
  if (index === -1) throw new ViewError(404, 4004, `观察项不存在：${watchId}`);
  snapshot.watchItems.splice(index, 1);
  await writeSnapshot(snapshot);
}

export async function patchWatchRule(snapshot: RiskSnapshot, watchId: string, status: "active" | "paused"): Promise<WatchItem> {
  const item = snapshot.watchItems.find((candidate) => candidate.watchId === watchId);
  if (!item) throw new ViewError(404, 4004, `观察项不存在：${watchId}`);
  item.status = status;
  await writeSnapshot(snapshot);
  return item;
}

export function buildReportOutline(snapshot: RiskSnapshot, eventId: string): { markdown: string; sourceUrls: string[] } {
  const event = snapshot.events.find((item) => item.eventId === eventId);
  if (!event) throw new ViewError(404, 4004, `事件不存在：${eventId}`);
  const assessment = snapshot.assessments.find((item) => item.eventId === eventId && item.targetType === "event");
  const evidence = snapshot.evidenceCards.filter((card) => assessment?.evidenceIds.includes(card.evidenceId));
  const edges = snapshot.edges.filter((edge) => edge.eventId === eventId);
  const exposures = snapshot.exposures.filter((exposure) => exposure.eventId === eventId);

  return {
    markdown: [
      `# ${event.title}`,
      "",
      `## 事件摘要`,
      event.summary,
      "",
      `## 传播路径摘要`,
      edges.length
        ? edges.map((edge) => `- ${edge.relationType}（${edge.derivationType} / ${edge.ruleId}）`).join("\n")
        : "- 当前公开字段不足以形成传播路径。",
      "",
      `## 核心暴露对象`,
      exposures.length
        ? exposures.map((exposure) => `- ${exposure.companyName}：${exposure.reason}`).join("\n")
        : "- 当前没有公开源直接点名的企业暴露对象。",
      "",
      `## 证据依据`,
      evidence.map((card) => `- [${card.sourceName}](${card.sourcePreviewUrl})：${card.phenomenon}`).join("\n"),
      "",
      `## 边界提示`,
      assessment?.boundaryHint ?? "所有结论均需回到公开原文复核，不构成投资或经营建议。"
    ].join("\n"),
    sourceUrls: [event.sourceUrl, ...evidence.map((card) => card.sourcePreviewUrl)]
  };
}

function resolveTarget(
  snapshot: RiskSnapshot,
  input: { targetType: WatchTargetType; targetId: string }
): { targetName: string; latestSignal: string; sourceUrl: string } {
  if (input.targetType === "event") {
    const event = snapshot.events.find((item) => item.eventId === input.targetId);
    if (!event) throw new ViewError(404, 4004, `事件不存在：${input.targetId}`);
    return { targetName: event.title, latestSignal: event.summary, sourceUrl: event.sourceUrl };
  }
  if (input.targetType === "node") {
    const node = snapshot.nodes.find((item) => item.nodeId === input.targetId);
    if (!node) throw new ViewError(404, 4004, `节点不存在：${input.targetId}`);
    return { targetName: node.nodeName, latestSignal: `${node.nodeType} 异常分值 ${node.abnormalScore}`, sourceUrl: node.sourceUrl };
  }
  const exposure = snapshot.exposures.find((item) => item.companyId === input.targetId);
  if (!exposure) throw new ViewError(404, 4004, `企业不存在：${input.targetId}`);
  return { targetName: exposure.companyName, latestSignal: exposure.reason, sourceUrl: exposure.sourceUrl };
}


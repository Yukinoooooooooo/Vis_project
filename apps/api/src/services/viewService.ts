import type {
  EventConstellationView,
  EvidenceAssessmentView,
  EventOverviewView,
  NodeExposureView,
  PropagationMapView,
  RadarView,
  SourceTrace,
  WatchWorkspaceView
} from "@risk-map/shared";
import type { Assessment, ExposureItem, RiskEvent, RiskNode, RiskSnapshot } from "../data/types";

export function getRadarView(snapshot: RiskSnapshot): RadarView {
  const items = snapshot.events.map((event) => {
    const eventNodes = snapshot.nodes.filter((node) => node.eventId === event.eventId);
    const eventExposures = snapshot.exposures.filter((exposure) => exposure.eventId === event.eventId);
    return {
      eventId: event.eventId,
      title: event.title,
      summary: event.summary,
      severityLevel: event.severityLevel,
      status: event.status,
      themeTags: event.themeTags,
      firstObservedAt: event.firstObservedAt,
      updatedAt: event.updatedAt,
      latestChange: event.summary,
      affectedNodeCount: eventNodes.length,
      affectedCompanyCount: eventExposures.length,
      isInWatchlist: snapshot.watchItems.some((item) => item.targetId === event.eventId),
      sourceUrl: event.sourceUrl,
      factType: event.factType
    };
  });

  return {
    context: baseContext(snapshot, null, null, "radar"),
    summary: {
      eventCount: items.length,
      highSeverityCount: items.filter((item) => item.severityLevel === "high" || item.severityLevel === "critical").length,
      expandingCount: items.filter((item) => item.status === "expanding").length,
      watchRelatedCount: snapshot.watchItems.length
    },
    items,
    sourceTrace: uniqueTrace(snapshot.events.map((event) => event.sourceTrace)),
    derivationPolicy: snapshot.derivationPolicy,
    partialDataNotice: snapshot.notices
  };
}

export function getEventConstellationView(snapshot: RiskSnapshot, requestedEventId?: string | null): EventConstellationView {
  const focus =
    (requestedEventId ? snapshot.events.find((event) => event.eventId === requestedEventId) : null) ??
    selectDefaultConstellationFocus(snapshot);

  const rankedEvents = focus
    ? snapshot.events
        .filter((event) => event.eventId !== focus.eventId)
        .filter((event) => shouldIncludeConstellationCandidate(focus, event))
        .map((event) => ({
          event,
          score: eventSimilarityScore(focus, event) + financialEventScore(event),
          lagDays: signedLagDays(focus.firstObservedAt, event.firstObservedAt)
        }))
        .sort((a, b) => b.score - a.score || a.lagDays - b.lagDays)
        .slice(0, 14)
    : [];
  const visibleEvents = focus ? [focus, ...rankedEvents.map((item) => item.event)] : snapshot.events.slice(0, 15);
  const visibleEventIds = new Set(visibleEvents.map((event) => event.eventId));
  const visibleChainNodes = snapshot.nodes
    .filter((node) => visibleEventIds.has(node.eventId))
    .sort((a, b) => Math.max(b.heatScore, b.abnormalScore) - Math.max(a.heatScore, a.abnormalScore))
    .slice(0, 24);
  const sourceNames = Array.from(new Set(visibleEvents.map((event) => event.sourceTrace.sourceName))).slice(0, 5);

  const eventNodes = visibleEvents.map((event, index) => {
    const eventLag = focus ? signedLagDays(focus.firstObservedAt, event.firstObservedAt) : 0;
    const angle = index === 0 ? 0 : ((index - 1) / Math.max(1, visibleEvents.length - 1)) * Math.PI * 2;
    return {
      id: event.eventId,
      kind: event.eventId === focus?.eventId ? ("focusEvent" as const) : ("relatedEvent" as const),
      label: event.title,
      eventId: event.eventId,
      nodeId: null,
      severityLevel: event.severityLevel,
      heatScore: eventHeatScore(snapshot, event),
      lagDays: eventLag,
      sourceName: event.sourceTrace.sourceName,
      sourceUrl: event.sourceUrl,
      factType: event.factType,
      financialMetric: event.financialMetric,
      positionHint: {
        radius: event.eventId === focus?.eventId ? 0 : 24,
        angle,
        layer: event.eventId === focus?.eventId ? 0 : 1
      }
    };
  });

  const chainNodes = visibleChainNodes.map((node, index) => {
    const owningEvent = snapshot.events.find((event) => event.eventId === node.eventId);
    const angle = (index / Math.max(1, visibleChainNodes.length)) * Math.PI * 2 + 0.18;
    return {
      id: node.nodeId,
      kind: "chainNode" as const,
      label: node.nodeName,
      eventId: node.eventId,
      nodeId: node.nodeId,
      severityLevel: node.riskLevel,
      heatScore: Math.max(node.heatScore, node.abnormalScore),
      lagDays: focus && owningEvent ? signedLagDays(focus.firstObservedAt, owningEvent.firstObservedAt) : 0,
      sourceName: node.sourceTrace.sourceName,
      sourceUrl: node.sourceUrl,
      factType: node.factType,
      financialMetric: node.financialMetric,
      positionHint: {
        radius: 42 + (index % 3) * 3,
        angle,
        layer: 3 + (index % 3)
      }
    };
  });

  const sourceNodes = sourceNames.map((sourceName, index) => {
    const sourceEvent = visibleEvents.find((event) => event.sourceTrace.sourceName === sourceName);
    return {
      id: `source_${hashKey(sourceName)}`,
      kind: "source" as const,
      label: sourceName,
      eventId: null,
      nodeId: null,
      severityLevel: "low" as const,
      heatScore: Math.min(95, visibleEvents.filter((event) => event.sourceTrace.sourceName === sourceName).length * 18 + 20),
      lagDays: 0,
      sourceName,
      sourceUrl: sourceEvent?.sourceUrl ?? "",
      factType: "directFact" as const,
      financialMetric: undefined,
      positionHint: {
        radius: 58,
        angle: (index / Math.max(1, sourceNames.length)) * Math.PI * 2 + 0.33,
        layer: 6
      }
    };
  });

  const eventRelations = focus
    ? rankedEvents.map(({ event, score, lagDays: eventLag }) => {
        const sharedTheme = event.themeTags.find((tag) => focus.themeTags.includes(tag));
        const sameSource = event.sourceTrace.sourceName === focus.sourceTrace.sourceName;
        return {
          id: `rel_${focus.eventId}_${event.eventId}`,
          sourceId: focus.eventId,
          targetId: event.eventId,
          kind: sameSource ? ("sharedSource" as const) : sharedTheme ? ("sharedTheme" as const) : ("temporalLag" as const),
          label: sameSource ? "同一公开源" : sharedTheme ? `共同主题：${sharedTheme}` : formatLagLabel(eventLag),
          strengthScore: Math.min(95, score),
          lagDays: eventLag,
          derivationType: "ruleDerived" as const,
          ruleId: sameSource ? "same-source-event-link" : sharedTheme ? "shared-theme-event-link" : "temporal-lag-event-link",
          sourceUrl: event.sourceUrl
        };
      })
    : [];

  const nodeRelations = visibleChainNodes.map((node) => ({
    id: `rel_${node.eventId}_${node.nodeId}`,
    sourceId: node.eventId,
    targetId: node.nodeId,
    kind: "eventToNode" as const,
    label: `${node.nodeType}：${node.nodeName}`,
    strengthScore: Math.max(node.heatScore, node.abnormalScore),
    lagDays: 0,
    derivationType: node.factType,
    ruleId: node.factType === "directFact" ? "source-field-node-link" : "source-fields-to-chain-nodes",
    sourceUrl: node.sourceUrl
  }));

  const sourceRelations = visibleEvents
    .map((event) => {
      const sourceNode = sourceNodes.find((node) => node.sourceName === event.sourceTrace.sourceName);
      if (!sourceNode) return null;
      return {
        id: `rel_${sourceNode.id}_${event.eventId}`,
        sourceId: sourceNode.id,
        targetId: event.eventId,
        kind: "sourceEvidence" as const,
        label: "来源证据",
        strengthScore: 72,
        lagDays: 0,
        derivationType: "directFact" as const,
        ruleId: "source-trace-to-event",
        sourceUrl: event.sourceUrl
      };
    })
    .filter((relation): relation is NonNullable<typeof relation> => Boolean(relation));

  const allNodes = [...eventNodes, ...chainNodes, ...sourceNodes];
  const allRelations = [...eventRelations, ...nodeRelations, ...sourceRelations];

  return {
    context: baseContext(snapshot, focus, null, "constellation"),
    focusEventId: focus?.eventId ?? null,
    summary: {
      eventCount: visibleEvents.length,
      chainNodeCount: visibleChainNodes.length,
      relationCount: allRelations.length,
      maxHeatScore: Math.max(0, ...allNodes.map((node) => node.heatScore)),
      maxLagDays: Math.max(0, ...allRelations.map((relation) => Math.abs(relation.lagDays))),
      financialSignalCount: allNodes.filter((node) => Boolean(node.financialMetric)).length,
      maxZScore: maxFinancialZ(allNodes),
      eventWindowLabel: eventWindowLabel(allNodes)
    },
    nodes: allNodes,
    relations: allRelations,
    heatLegend: [
      { label: "低联动热度", minScore: 0, color: "#38bdf8" },
      { label: "中联动热度", minScore: 45, color: "#facc15" },
      { label: "高联动热度", minScore: 70, color: "#fb7185" }
    ],
    lagLegend: [
      { label: "同步/近实时", maxLagDays: 1, color: "#14b8a6" },
      { label: "短滞后", maxLagDays: 7, color: "#f59e0b" },
      { label: "长滞后", maxLagDays: 9999, color: "#ef4444" }
    ],
    sourceTrace: uniqueTrace(visibleEvents.map((event) => event.sourceTrace)),
    derivationPolicy: snapshot.derivationPolicy,
    partialDataNotice: snapshot.notices
  };
}

export function getEventOverviewView(snapshot: RiskSnapshot, eventId: string): EventOverviewView {
  const event = requireEvent(snapshot, eventId);
  const eventNodes = snapshot.nodes.filter((node) => node.eventId === event.eventId);
  const eventEdges = snapshot.edges.filter((edge) => edge.eventId === event.eventId);
  const exposures = snapshot.exposures.filter((exposure) => exposure.eventId === event.eventId);
  const assessment = findAssessment(snapshot, "event", event.eventId);

  return {
    context: baseContext(snapshot, event, null, "event"),
    header: {
      eventId: event.eventId,
      title: event.title,
      summary: event.summary,
      source: event.sourceTrace.sourceName,
      occurredAt: event.firstObservedAt,
      updatedAt: event.updatedAt,
      severityLevel: event.severityLevel,
      status: event.status,
      themeTags: event.themeTags,
      isInWatchlist: snapshot.watchItems.some((item) => item.targetId === event.eventId),
      sourceUrl: event.sourceUrl
    },
    overview: {
      judgmentLevel: assessment.judgmentLevel,
      evidenceLevel: assessment.evidenceLevel,
      affectedNodeCount: eventNodes.length,
      affectedCompanyCount: exposures.length,
      expandingPathCount: eventEdges.length,
      boundaryHint: assessment.boundaryHint,
      latestWindowChange: event.summary
    },
    keyAssessments: [assessment, ...snapshot.assessments.filter((item) => item.eventId === event.eventId && item.targetType !== "event")]
      .slice(0, 4)
      .map((item) => ({
        assessmentId: item.assessmentId,
        targetType: item.targetType,
        targetId: item.targetId,
        targetName: item.targetName,
        judgmentText: item.judgmentText,
        judgmentLevel: item.judgmentLevel,
        evidenceLevel: item.evidenceLevel,
        evidenceCount: item.evidenceIds.length,
        canNavigateToEvidence: item.evidenceIds.length > 0
      })),
    pathSummary: {
      primaryPathCount: eventEdges.filter((edge) => edge.isPrimaryPath).length,
      secondaryPathCount: eventEdges.filter((edge) => !edge.isPrimaryPath).length,
      keyNodeIds: eventNodes.filter((node) => node.isPrimaryPath).slice(0, 3).map((node) => node.nodeId),
      summaryText: eventEdges.length
        ? "传播路径由同一公开记录内的产品/企业/地区字段关系生成，需结合证据卡理解边界。"
        : "当前公开源字段不足以生成传播路径。"
    },
    nextActions: [
      { actionId: "map", label: "查看传播地图", href: `/events/${event.eventId}/map` },
      {
        actionId: "evidence",
        label: "阅读证据",
        href: `/events/${event.eventId}/evidence?targetType=event&targetId=${event.eventId}`
      }
    ],
    sourceTrace: uniqueTrace([event.sourceTrace, assessment.sourceTrace, ...eventEdges.map((edge) => edge.sourceTrace)]),
    derivationPolicy: snapshot.derivationPolicy,
    partialDataNotice: snapshot.notices
  };
}

export function getPropagationMapView(snapshot: RiskSnapshot, eventId: string): PropagationMapView {
  const event = requireEvent(snapshot, eventId);
  const nodes = snapshot.nodes.filter((node) => node.eventId === eventId);
  const edges = snapshot.edges.filter((edge) => edge.eventId === eventId);

  return {
    context: baseContext(snapshot, event, null, "map"),
    summary: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      primaryPathCount: edges.filter((edge) => edge.isPrimaryPath).length,
      expandingNodeCount: nodes.filter((node) => node.isExpanded).length,
      focusNodeId: nodes[0]?.nodeId ?? null
    },
    graph: {
      nodes: nodes.map((node) => ({
        nodeId: node.nodeId,
        nodeName: node.nodeName,
        nodeType: node.nodeType,
        riskLevel: node.riskLevel,
        heatScore: node.heatScore,
        abnormalScore: node.abnormalScore,
        isPrimaryPath: node.isPrimaryPath,
        isExpanded: node.isExpanded,
        upstreamCount: edges.filter((edge) => edge.targetNodeId === node.nodeId).length,
        downstreamCount: edges.filter((edge) => edge.sourceNodeId === node.nodeId).length,
        sourceUrl: node.sourceUrl,
        factType: node.factType
      })),
      edges: edges.map((edge) => ({
        edgeId: edge.edgeId,
        sourceNodeId: edge.sourceNodeId,
        targetNodeId: edge.targetNodeId,
        relationType: edge.relationType,
        strengthScore: edge.strengthScore,
        isPrimaryPath: edge.isPrimaryPath,
        derivationType: edge.derivationType,
        ruleId: edge.ruleId,
        sourceUrl: edge.sourceUrl
      }))
    },
    timeline: {
      points: [
        {
          pointId: "snapshot",
          label: "公开快照",
          activeNodeCount: nodes.length,
          changedNodeCount: edges.length,
          isCurrent: true
        }
      ]
    },
    legend: [
      { key: "direct", label: "来源事实", factType: "directFact" },
      { key: "computed", label: "计算信号", factType: "computedSignal" },
      { key: "derived", label: "规则推导", factType: "ruleDerived" }
    ],
    sourceTrace: uniqueTrace([event.sourceTrace, ...nodes.map((node) => node.sourceTrace), ...edges.map((edge) => edge.sourceTrace)]),
    derivationPolicy: snapshot.derivationPolicy,
    partialDataNotice: snapshot.notices
  };
}

export function getNodeExposureView(snapshot: RiskSnapshot, eventId: string, nodeId: string): NodeExposureView {
  const event = requireEvent(snapshot, eventId);
  const node = requireNode(snapshot, eventId, nodeId);
  const edges = snapshot.edges.filter((edge) => edge.eventId === eventId);
  const upstreamNodes = edges
    .filter((edge) => edge.targetNodeId === node.nodeId)
    .map((edge) => toNodeMini(requireNode(snapshot, eventId, edge.sourceNodeId), edge.relationType));
  const downstreamNodes = edges
    .filter((edge) => edge.sourceNodeId === node.nodeId)
    .map((edge) => toNodeMini(requireNode(snapshot, eventId, edge.targetNodeId), edge.relationType));
  const exposures = snapshot.exposures.filter((exposure) => exposure.nodeId === node.nodeId);
  const assessment = findAssessment(snapshot, "node", node.nodeId, false) ?? findAssessment(snapshot, "event", event.eventId);

  return {
    context: {
      ...baseContext(snapshot, event, null, "node"),
      nodeId: node.nodeId
    },
    nodeCard: {
      nodeId: node.nodeId,
      nodeName: node.nodeName,
      nodeType: node.nodeType,
      riskLevel: node.riskLevel,
      judgmentLevel: assessment.judgmentLevel,
      evidenceLevel: assessment.evidenceLevel,
      firstAbnormalAt: event.firstObservedAt,
      summary: `${node.nodeName} 来自 ${node.sourceTrace.sourceName} 的 ${node.sourceTrace.fieldPath} 字段。`,
      boundaryHint: assessment.boundaryHint,
      sourceUrl: node.sourceUrl,
      factType: node.factType
    },
    upstreamDownstream: {
      upstreamNodes,
      downstreamNodes,
      keyBridgeNodes: [...upstreamNodes, ...downstreamNodes].slice(0, 3)
    },
    exposureGroups: ["core", "indirect", "weak"].map((level) => {
      const levelItems = exposures.filter((exposure) => exposure.exposureLevel === level);
      return {
        groupKey: level as "core" | "indirect" | "weak",
        groupLabel: level === "core" ? "重点点名" : level === "indirect" ? "间接相关" : "弱相关",
        itemCount: levelItems.length,
        items: levelItems
      };
    }),
    signals: {
      nodeSignals: snapshot.signals.filter((signal) => signal.seriesId === `sig_${node.nodeId}`),
      companySignals: exposures.flatMap((exposure) =>
        snapshot.signals.filter((signal) => signal.label.includes(exposure.companyName))
      ),
      trendSummary: "异常分值由公开源分类、震级或召回等级映射，页面不将其表述为经营结果。"
    },
    companyPreview: exposures[0]
      ? {
          companyId: exposures[0].companyId,
          companyName: exposures[0].companyName,
          reason: exposures[0].reason,
          sourceUrl: exposures[0].sourceUrl
        }
      : null,
    sourceTrace: uniqueTrace([event.sourceTrace, node.sourceTrace, ...exposures.map((exposure) => exposure.sourceTrace)]),
    derivationPolicy: snapshot.derivationPolicy,
    partialDataNotice: snapshot.notices
  };
}

export function getEvidenceAssessmentView(
  snapshot: RiskSnapshot,
  eventId: string,
  targetType: "event" | "node" | "company",
  targetId: string,
  compareTargetId: string | null
): EvidenceAssessmentView {
  const event = requireEvent(snapshot, eventId);
  const assessment =
    findAssessment(snapshot, targetType, targetId, false) ??
    findAssessment(snapshot, "event", event.eventId);
  const evidenceCards = snapshot.evidenceCards.filter((card) =>
    assessment.evidenceIds.length ? assessment.evidenceIds.includes(card.evidenceId) : card.objectId === targetId
  );

  return {
    context: {
      ...baseContext(snapshot, event, null, "evidence"),
      targetType,
      targetId
    },
    assessment: {
      targetType: assessment.targetType,
      targetId: assessment.targetId,
      targetName: assessment.targetName,
      judgmentText: assessment.judgmentText,
      judgmentLevel: assessment.judgmentLevel,
      evidenceLevel: assessment.evidenceLevel,
      boundaryHint: assessment.boundaryHint,
      evidenceCount: evidenceCards.length,
      lastReviewedAt: snapshot.generatedAt
    },
    evidenceCards,
    comparison: {
      compareTargetId,
      compareTargetName: compareTargetId,
      differenceSummary: compareTargetId
        ? "首版仅展示证据集合差异入口；具体比较需在同类对象间继续补充真实序列。"
        : "未选择比较对象。",
      sharedEvidenceIds: [],
      exclusiveEvidenceIds: evidenceCards.map((card) => card.evidenceId)
    },
    uncertainty: {
      missingEvidenceTypes: evidenceCards.some((card) => card.factType === "ruleDerived") ? ["direct causal evidence"] : [],
      conflictNote: null,
      nextSuggestedAction: "继续观察同一来源是否更新，并优先核查官方原文。"
    },
    sourcePreviewEnabled: evidenceCards.length > 0,
    sourceTrace: uniqueTrace([event.sourceTrace, assessment.sourceTrace, ...evidenceCards.map((card) => card.sourceTrace)]),
    derivationPolicy: snapshot.derivationPolicy,
    partialDataNotice: snapshot.notices
  };
}

export function getWatchWorkspaceView(snapshot: RiskSnapshot): WatchWorkspaceView {
  return {
    context: baseContext(snapshot, null, null, "watch"),
    summary: {
      watchItemCount: snapshot.watchItems.length,
      activeRuleCount: snapshot.watchItems.filter((item) => item.status === "active").length,
      changedTodayCount: snapshot.watchItems.length
    },
    items: snapshot.watchItems,
    changeFeed: snapshot.watchItems.map((item) => ({
      changeId: `chg_${item.watchId}`,
      watchId: item.watchId,
      targetName: item.targetName,
      summary: item.latestSignal,
      changedAt: snapshot.generatedAt,
      sourceUrl: item.sourceUrl
    })),
    ruleSummary: {
      enabledCount: snapshot.watchItems.filter((item) => item.status === "active").length,
      pausedCount: snapshot.watchItems.filter((item) => item.status === "paused").length,
      defaultWindowLabel: snapshot.windowLabel
    },
    sourceTrace: uniqueTrace(snapshot.events.map((event) => event.sourceTrace)),
    derivationPolicy: snapshot.derivationPolicy,
    partialDataNotice: snapshot.notices
  };
}

function baseContext(
  snapshot: RiskSnapshot,
  event: RiskEvent | null,
  eventName: string | null,
  viewMode: "radar" | "event" | "map" | "node" | "evidence" | "watch" | "constellation"
) {
  return {
    eventId: event?.eventId ?? null,
    eventName: event?.title ?? eventName,
    windowId: snapshot.windowId,
    windowLabel: snapshot.windowLabel,
    updatedAt: snapshot.generatedAt,
    viewMode
  };
}

function eventHeatScore(snapshot: RiskSnapshot, event: RiskEvent): number {
  const metric = event.financialMetric;
  if (metric) return Math.min(100, Math.max(45, Math.round(48 + Math.max(0, metric.peakZScore) * 15 + (metric.firstAbnormalDate ? 10 : 0))));
  const nodeCount = snapshot.nodes.filter((node) => node.eventId === event.eventId).length;
  const exposureCount = snapshot.exposures.filter((exposure) => exposure.eventId === event.eventId).length;
  const severityBase = event.severityLevel === "critical" ? 88 : event.severityLevel === "high" ? 72 : event.severityLevel === "medium" ? 52 : 30;
  return Math.min(100, severityBase + nodeCount * 4 + exposureCount * 7);
}

function eventSimilarityScore(focus: RiskEvent, event: RiskEvent): number {
  const sharedTags = event.themeTags.filter((tag) => focus.themeTags.includes(tag)).length;
  const sameSource = event.sourceTrace.sourceName === focus.sourceTrace.sourceName ? 28 : 0;
  const sameSeverityBand = event.severityLevel === focus.severityLevel ? 12 : 0;
  const temporalScore = Math.max(0, 24 - Math.abs(signedLagDays(focus.firstObservedAt, event.firstObservedAt)));
  const financialBridge = focus.themeTags.includes("spacex") && event.themeTags.includes("financial-proxy") ? 40 : 0;
  return sharedTags * 18 + sameSource + sameSeverityBand + temporalScore + financialBridge;
}

function shouldIncludeConstellationCandidate(focus: RiskEvent, event: RiskEvent): boolean {
  if (!focus.themeTags.includes("center-hotspot")) return true;
  if (event.themeTags.includes("spacex")) return true;
  if (event.themeTags.includes("financial-hotspot")) return true;
  if (event.themeTags.includes("financial-proxy")) return true;
  if (event.themeTags.includes("valuation") || event.themeTags.includes("regulatory-risk")) return true;
  if (event.themeTags.includes("technology-chain")) return true;
  if (event.themeTags.includes("semiconductor") || event.themeTags.includes("aerospace")) return true;
  if (event.themeTags.includes("trade") || event.themeTags.includes("imports") || event.themeTags.includes("sec")) return true;
  if (event.sourceTrace.sourceType === "marketStatistic" || event.sourceTrace.sourceType === "filing") return true;
  return false;
}

function formatLagLabel(days: number): string {
  if (days === 0) return "同步响应";
  if (days < 0) return `领先 ${Math.abs(days)} 天`;
  return `滞后 ${days} 天`;
}

function selectDefaultConstellationFocus(snapshot: RiskSnapshot): RiskEvent | null {
  return (
    [...snapshot.events].sort((a, b) => financialEventScore(b) - financialEventScore(a))[0] ??
    snapshot.events.find((event) => event.severityLevel === "critical" || event.severityLevel === "high") ??
    snapshot.events[0] ??
    null
  );
}

function financialEventScore(event: RiskEvent): number {
  let score = 0;
  if (event.themeTags.includes("center-hotspot")) score += 1000;
  if (event.themeTags.includes("financial-hotspot")) score += 240;
  if (event.themeTags.includes("spacex")) score += 180;
  if (event.themeTags.includes("financial-proxy")) score += 140;
  if (event.themeTags.includes("technology-chain")) score += 80;
  if (event.financialMetric) score += 120 + Math.max(0, event.financialMetric.peakZScore) * 20;
  if (event.sourceTrace.sourceType === "marketStatistic") score += 45;
  if (event.sourceTrace.sourceType === "disaster") score -= 260;
  return score;
}

function maxFinancialZ(nodes: Array<{ financialMetric?: { peakZScore: number } }>): number | null {
  const values = nodes.map((node) => node.financialMetric?.peakZScore).filter((value): value is number => typeof value === "number");
  if (!values.length) return null;
  return Number(Math.max(...values).toFixed(2));
}

function eventWindowLabel(nodes: Array<{ financialMetric?: { eventWindow: { start: string; end: string } } }>): string | null {
  const metric = nodes.find((node) => node.financialMetric)?.financialMetric;
  if (!metric) return null;
  return `${metric.eventWindow.start.slice(0, 7)}~${metric.eventWindow.end.slice(0, 7)}`;
}

function signedLagDays(a: string, b: string): number {
  const first = new Date(a).getTime();
  const second = new Date(b).getTime();
  if (Number.isNaN(first) || Number.isNaN(second)) return 0;
  return Math.round((second - first) / 86_400_000);
}

function lagDays(a: string, b: string): number {
  return Math.abs(signedLagDays(a, b));
}

function hashKey(input: string): string {
  let hash = 0;
  for (const char of input) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash.toString(16);
}

function requireEvent(snapshot: RiskSnapshot, eventId: string): RiskEvent {
  const event = snapshot.events.find((item) => item.eventId === eventId);
  if (!event) throw new ViewError(404, 4004, `事件不存在：${eventId}`);
  return event;
}

function requireNode(snapshot: RiskSnapshot, eventId: string, nodeId: string): RiskNode {
  const node = snapshot.nodes.find((item) => item.eventId === eventId && item.nodeId === nodeId);
  if (!node) throw new ViewError(404, 4004, `节点不存在：${nodeId}`);
  return node;
}

function findAssessment(
  snapshot: RiskSnapshot,
  targetType: "event" | "node" | "company",
  targetId: string,
  throwIfMissing = true
): Assessment {
  const assessment = snapshot.assessments.find((item) => item.targetType === targetType && item.targetId === targetId);
  if (!assessment && throwIfMissing) throw new ViewError(404, 4004, `判断不存在：${targetType}/${targetId}`);
  return assessment as Assessment;
}

function toNodeMini(node: RiskNode, relationType: string) {
  return {
    nodeId: node.nodeId,
    nodeName: node.nodeName,
    riskLevel: node.riskLevel,
    relationType,
    sourceUrl: node.sourceUrl
  };
}

function uniqueTrace(traces: SourceTrace[]): SourceTrace[] {
  const seen = new Set<string>();
  return traces.filter((trace) => {
    const key = `${trace.sourceName}:${trace.rawRecordId}:${trace.fieldPath}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export class ViewError extends Error {
  constructor(
    readonly status: number,
    readonly code: number,
    message: string
  ) {
    super(message);
  }
}

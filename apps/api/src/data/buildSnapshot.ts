import type { EvidenceCard, FinancialSignalMetric, SignalSeries, SourceTrace, WatchItem } from "@risk-map/shared";
import type { ConnectorResult, SourceRecord } from "../connectors/types";
import type { Assessment, ExposureItem, RiskEdge, RiskEvent, RiskNode, RiskSnapshot } from "./types";
import { derivationPolicy } from "./derivationPolicy";

export function buildSnapshot(results: ConnectorResult[]): RiskSnapshot {
  const generatedAt = new Date().toISOString();
  const records = results.flatMap((result) => result.records);
  const events = records.map((record) => buildEvent(record));
  const nodes = events.flatMap((event) => buildNodes(event, findRecord(records, event.eventId)));
  const edges = events.flatMap((event) => buildEdges(event, nodes.filter((node) => node.eventId === event.eventId)));
  const exposures = events.flatMap((event) => buildExposures(event, nodes, findRecord(records, event.eventId)));
  const signals = buildSignals(events, nodes);
  const evidenceCards = buildEvidence(events, nodes, edges, exposures);
  const assessments = buildAssessments(events, nodes, exposures, evidenceCards);
  const watchItems = buildInitialWatchItems(events, exposures, generatedAt);

  return {
    generatedAt,
    windowId: "w_latest_public",
    windowLabel: "最新公开快照",
    sources: results.map((result) => result.descriptor),
    notices: results.flatMap((result) => (result.notice ? [result.notice] : [])),
    derivationPolicy,
    events,
    nodes,
    edges,
    exposures,
    evidenceCards,
    assessments,
    signals,
    watchItems
  };
}

function buildEvent(record: SourceRecord): RiskEvent {
  const trace = toSourceTrace(record, record.quotedFields[0]?.fieldPath ?? "record", record.quotedFields[0]?.value ?? record.title);
  return {
    eventId: `evt_${record.id}`,
    title: record.title,
    summary: record.summary,
    severityLevel: record.severityHint,
    status: record.statusHint,
    themeTags: record.tags.slice(0, 5),
    firstObservedAt: record.occurredAt,
    updatedAt: record.updatedAt,
    sourceTrace: trace,
    sourceUrl: record.sourceUrl,
    factType: "directFact",
    financialMetric: extractFinancialMetric(record.rawFields)
  };
}

function buildNodes(event: RiskEvent, record: SourceRecord | undefined): RiskNode[] {
  if (!record) return [];
  const nodes: RiskNode[] = [];
  const baseScore = recordFinancialScore(record) ?? severityToScore(record.severityHint);
  const financialMetric = extractFinancialMetric(record.rawFields);

  const product = record.productOrCommodityName ?? record.title;
  nodes.push({
    nodeId: `${event.eventId}_product`,
    eventId: event.eventId,
    nodeName: compact(product, 88),
    nodeType: "产品/商品节点",
    riskLevel: record.severityHint,
    heatScore: baseScore,
    abnormalScore: baseScore,
    isPrimaryPath: true,
    isExpanded: record.statusHint === "expanding",
    sourceTrace: toSourceTrace(record, "productOrCommodityName", product),
    sourceUrl: record.sourceUrl,
    factType: record.productOrCommodityName ? "directFact" : "ruleDerived",
    financialMetric
  });

  if (record.primaryEntityName) {
    nodes.push({
      nodeId: `${event.eventId}_entity`,
      eventId: event.eventId,
      nodeName: compact(record.primaryEntityName, 88),
      nodeType: "企业/机构节点",
      riskLevel: record.severityHint,
      heatScore: Math.max(35, baseScore - 8),
      abnormalScore: Math.max(30, baseScore - 12),
      isPrimaryPath: true,
      isExpanded: record.statusHint === "expanding",
      sourceTrace: toSourceTrace(record, "primaryEntityName", record.primaryEntityName),
      sourceUrl: record.sourceUrl,
      factType: "directFact",
      financialMetric
    });
  }

  if (record.regionName) {
    nodes.push({
      nodeId: `${event.eventId}_region`,
      eventId: event.eventId,
      nodeName: compact(record.regionName, 88),
      nodeType: "地区/流向节点",
      riskLevel: softenSeverity(record.severityHint),
      heatScore: Math.max(25, baseScore - 18),
      abnormalScore: Math.max(20, baseScore - 25),
      isPrimaryPath: true,
      isExpanded: false,
      sourceTrace: toSourceTrace(record, "regionName", record.regionName),
      sourceUrl: record.sourceUrl,
      factType: "directFact",
      financialMetric
    });
  }

  return nodes;
}

function buildEdges(event: RiskEvent, nodes: RiskNode[]): RiskEdge[] {
  const product = nodes.find((node) => node.nodeId.endsWith("_product"));
  const entity = nodes.find((node) => node.nodeId.endsWith("_entity"));
  const region = nodes.find((node) => node.nodeId.endsWith("_region"));
  const edges: RiskEdge[] = [];

  if (product && entity) {
    edges.push({
      edgeId: `${event.eventId}_edge_product_entity`,
      eventId: event.eventId,
      sourceNodeId: product.nodeId,
      targetNodeId: entity.nodeId,
      relationType: "同一公开记录中产品/商品与企业字段共现",
      strengthScore: 78,
      isPrimaryPath: true,
      derivationType: "ruleDerived",
      ruleId: "field-proximity-to-propagation-edge",
      sourceUrl: event.sourceUrl,
      sourceTrace: product.sourceTrace
    });
  }

  if (entity && region) {
    edges.push({
      edgeId: `${event.eventId}_edge_entity_region`,
      eventId: event.eventId,
      sourceNodeId: entity.nodeId,
      targetNodeId: region.nodeId,
      relationType: "同一公开记录中企业/机构与地区字段共现",
      strengthScore: 64,
      isPrimaryPath: true,
      derivationType: "ruleDerived",
      ruleId: "field-proximity-to-propagation-edge",
      sourceUrl: event.sourceUrl,
      sourceTrace: entity.sourceTrace
    });
  }

  return edges;
}

function buildExposures(event: RiskEvent, nodes: RiskNode[], record: SourceRecord | undefined): ExposureItem[] {
  if (!record?.primaryEntityName) return [];
  const eligible = ["openFDA Drug Enforcement", "NHTSA Vehicle Recalls", "SEC EDGAR Submissions"];
  if (!eligible.includes(record.sourceName)) return [];
  const node = nodes.find((candidate) => candidate.eventId === event.eventId && candidate.nodeId.endsWith("_entity"));
  if (!node) return [];

  return [
    {
      eventId: event.eventId,
      nodeId: node.nodeId,
      companyId: `co_${hashKey(record.primaryEntityName)}`,
      companyName: record.primaryEntityName,
      exposureScore: severityToScore(record.severityHint),
      exposureLevel: "core",
      signalStatus: record.statusHint === "expanding" ? "公开源显示仍在进展" : "公开源已点名，需观察后续更新",
      isInWatchlist: false,
      reason: `公开源 ${record.sourceName} 直接点名该企业/机构。`,
      factType: "directFact",
      sourceUrl: record.sourceUrl,
      sourceTrace: toSourceTrace(record, "primaryEntityName", record.primaryEntityName)
    }
  ];
}

function buildSignals(events: RiskEvent[], nodes: RiskNode[]): SignalSeries[] {
  return nodes.map((node) => {
    const event = events.find((candidate) => candidate.eventId === node.eventId);
    const date = event?.firstObservedAt.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
    const metric = node.financialMetric;
    return {
      seriesId: `sig_${node.nodeId}`,
      label: metric ? `${node.nodeName} ${metric.metricName}` : `${node.nodeName} 异常分值`,
      factType: "computedSignal" as const,
      sourceUrl: node.sourceUrl,
      points: metric
        ? metric.points.map((point) => ({ date: point.date, value: point.value }))
        : [
            { date, value: Math.max(0, node.abnormalScore - 15) },
            { date: event?.updatedAt.slice(0, 10) ?? date, value: node.abnormalScore }
          ]
    };
  });
}

function buildEvidence(events: RiskEvent[], nodes: RiskNode[], edges: RiskEdge[], exposures: ExposureItem[]): EvidenceCard[] {
  const eventEvidence = events.map((event): EvidenceCard => ({
    evidenceId: `evd_${event.eventId}_fact`,
    objectType: "event",
    objectId: event.eventId,
    objectName: event.title,
    phenomenon: event.financialMetric
      ? `${event.summary} 指标计算：${event.financialMetric.calculation}`
      : event.summary,
    capturedAt: event.updatedAt,
    sourceName: event.sourceTrace.sourceName,
    sourceType: event.sourceTrace.sourceType,
    evidenceLevel: "E3",
    factType: "directFact",
    boundaryHint: "该卡片仅说明公开源记录了该事件，不单独证明产业链因果关系。",
    quoteFields: event.sourceTrace.fieldPath ? [event.sourceTrace.fieldPath] : [],
    supportsJudgmentIds: [`asm_${event.eventId}`],
    comparisonHint: null,
    sourcePreviewUrl: event.sourceUrl,
    sourceTrace: event.sourceTrace
  }));

  const edgeEvidence = edges.map((edge): EvidenceCard => {
    const source = nodes.find((node) => node.nodeId === edge.sourceNodeId);
    const target = nodes.find((node) => node.nodeId === edge.targetNodeId);
    return {
      evidenceId: `evd_${edge.edgeId}`,
      objectType: "node",
      objectId: edge.sourceNodeId,
      objectName: `${source?.nodeName ?? edge.sourceNodeId} -> ${target?.nodeName ?? edge.targetNodeId}`,
      phenomenon: `系统基于规则“${edge.ruleId}”生成传播边：${edge.relationType}。`,
      capturedAt: edge.sourceTrace.fetchedAt,
      sourceName: edge.sourceTrace.sourceName,
      sourceType: edge.sourceTrace.sourceType,
      evidenceLevel: "E2",
      factType: "ruleDerived",
      boundaryHint: "这是可解释推导，不应表述为强因果结论。",
      quoteFields: [edge.sourceTrace.fieldPath],
      supportsJudgmentIds: [`asm_${edge.eventId}`],
      comparisonHint: "用于说明结构关联，不用于证明实际影响强度。",
      sourcePreviewUrl: edge.sourceUrl,
      sourceTrace: edge.sourceTrace
    };
  });

  const exposureEvidence = exposures.map((exposure): EvidenceCard => ({
    evidenceId: `evd_${exposure.companyId}_${exposure.nodeId}`,
    objectType: "company",
    objectId: exposure.companyId,
    objectName: exposure.companyName,
    phenomenon: exposure.reason,
    capturedAt: exposure.sourceTrace.fetchedAt,
    sourceName: exposure.sourceTrace.sourceName,
    sourceType: exposure.sourceTrace.sourceType,
    evidenceLevel: "E3",
    factType: exposure.factType,
    boundaryHint: "企业被公开源点名不等同于财务影响，需结合后续披露和信号验证。",
    quoteFields: [exposure.sourceTrace.fieldPath],
    supportsJudgmentIds: [`asm_${exposure.companyId}`],
    comparisonHint: null,
    sourcePreviewUrl: exposure.sourceUrl,
    sourceTrace: exposure.sourceTrace
  }));

  return [...eventEvidence, ...edgeEvidence, ...exposureEvidence];
}

function buildAssessments(
  events: RiskEvent[],
  nodes: RiskNode[],
  exposures: ExposureItem[],
  evidenceCards: EvidenceCard[]
): Assessment[] {
  const eventAssessments = events.map((event): Assessment => {
    const eventNodes = nodes.filter((node) => node.eventId === event.eventId);
    const evidenceIds = evidenceCards
      .filter((card) => card.objectId === event.eventId || eventNodes.some((node) => node.nodeId === card.objectId))
      .map((card) => card.evidenceId);

    return {
      assessmentId: `asm_${event.eventId}`,
      eventId: event.eventId,
      targetType: "event",
      targetId: event.eventId,
      targetName: event.title,
      judgmentText: event.financialMetric
        ? `按事件窗计算，${event.financialMetric.proxyVariable} 峰值 z-score 为 ${event.financialMetric.peakZScore}，峰值日 ${event.financialMetric.peakDate}；这是代理变量观察，不作因果结论。`
        : `公开源显示该事件涉及 ${eventNodes.length} 个可追溯节点；目前应作为风险观察对象，而非确定性因果结论。`,
      judgmentLevel: event.severityLevel === "critical" ? "J3" : event.severityLevel === "high" ? "J2" : "J1",
      evidenceLevel: evidenceIds.length >= 3 ? "E3" : "E2",
      boundaryHint: "判断强度受限于公开源覆盖范围和字段粒度。",
      evidenceIds,
      sourceTrace: event.sourceTrace
    };
  });

  const exposureAssessments = exposures.map((exposure): Assessment => ({
    assessmentId: `asm_${exposure.companyId}`,
    eventId: exposure.eventId,
    targetType: "company",
    targetId: exposure.companyId,
    targetName: exposure.companyName,
    judgmentText: `公开源直接点名 ${exposure.companyName}，可作为核心暴露对象进入观察名单。`,
    judgmentLevel: exposure.exposureLevel === "core" ? "J2" : "J1",
    evidenceLevel: "E3",
    boundaryHint: "该判断仅说明公开记录中的暴露关系，不构成经营或投资影响判断。",
    evidenceIds: evidenceCards.filter((card) => card.objectId === exposure.companyId).map((card) => card.evidenceId),
    sourceTrace: exposure.sourceTrace
  }));

  return [...eventAssessments, ...exposureAssessments];
}

function buildInitialWatchItems(events: RiskEvent[], exposures: ExposureItem[], generatedAt: string): WatchItem[] {
  const firstEvent = events[0];
  const firstExposure = exposures[0];
  const items: WatchItem[] = [];

  if (firstEvent) {
    items.push({
      watchId: `watch_${firstEvent.eventId}`,
      targetType: "event",
      targetId: firstEvent.eventId,
      targetName: firstEvent.title,
      status: "active",
      createdAt: generatedAt,
      latestSignal: firstEvent.summary,
      sourceUrl: firstEvent.sourceUrl
    });
  }

  if (firstExposure) {
    items.push({
      watchId: `watch_${firstExposure.companyId}`,
      targetType: "company",
      targetId: firstExposure.companyId,
      targetName: firstExposure.companyName,
      status: "active",
      createdAt: generatedAt,
      latestSignal: firstExposure.reason,
      sourceUrl: firstExposure.sourceUrl
    });
  }

  return items;
}

function findRecord(records: SourceRecord[], eventId: string): SourceRecord | undefined {
  const recordId = eventId.replace(/^evt_/, "");
  return records.find((record) => record.id === recordId);
}

export function toSourceTrace(record: SourceRecord, fieldPath: string, quote: string): SourceTrace {
  return {
    sourceId: record.id,
    sourceName: record.sourceName,
    sourceType: record.sourceType,
    sourceUrl: record.sourceUrl,
    fetchedAt: record.fetchedAt,
    rawRecordId: record.rawRecordId,
    licenseNote: record.licenseNote,
    fieldPath,
    quote: compact(quote, 240)
  };
}

function severityToScore(severity: string): number {
  if (severity === "critical") return 92;
  if (severity === "high") return 78;
  if (severity === "medium") return 58;
  return 34;
}

function softenSeverity(severity: "low" | "medium" | "high" | "critical"): "low" | "medium" | "high" | "critical" {
  if (severity === "critical") return "high";
  if (severity === "high") return "medium";
  return severity;
}

function compact(value: string, length: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > length ? `${normalized.slice(0, length - 1)}…` : normalized;
}

function hashKey(input: string): string {
  let hash = 0;
  for (const char of input) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash.toString(16);
}



function extractFinancialMetric(rawFields: Record<string, unknown>): FinancialSignalMetric | undefined {
  const candidate = rawFields.financialMetric;
  if (!candidate || typeof candidate !== "object") return undefined;
  const metric = candidate as FinancialSignalMetric;
  if (!metric.proxyVariable || !Array.isArray(metric.points)) return undefined;
  return metric;
}

function recordFinancialScore(record: SourceRecord): number | null {
  const metric = extractFinancialMetric(record.rawFields);
  if (!metric) return null;
  return Math.min(100, Math.max(35, Math.round(45 + Math.max(0, metric.peakZScore) * 16 + (metric.firstAbnormalDate ? 10 : 0))));
}

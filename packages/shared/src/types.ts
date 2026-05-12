export type SeverityLevel = "low" | "medium" | "high" | "critical";
export type EventStatus = "new" | "tracking" | "expanding" | "stabilizing" | "closed";
export type JudgmentLevel = "J1" | "J2" | "J3" | "J4";
export type EvidenceLevel = "E1" | "E2" | "E3" | "E4";
export type FactType = "directFact" | "computedSignal" | "ruleDerived";
export type DerivationType = FactType;
export type WatchTargetType = "event" | "node" | "company";

export type FinancialSignalPoint = {
  date: string;
  value: number;
  rawValue: number;
  label?: string;
};

export type FinancialSignalMetric = {
  metricName: string;
  proxyVariable: string;
  eventDate: string;
  eventWindow: {
    start: string;
    end: string;
  };
  baselineWindow: {
    start: string;
    end: string;
  };
  threshold: number;
  firstAbnormalDate: string | null;
  peakDate: string;
  peakZScore: number;
  medianLagDays: number;
  calculation: string;
  sourceField: string;
  points: FinancialSignalPoint[];
};

export type ViewMode = "radar" | "event" | "map" | "node" | "evidence" | "watch" | "constellation";

export type ApiResponse<T> = {
  code: number;
  message: string;
  data: T;
  meta: {
    requestId: string;
    generatedAt: string;
  };
};

export type SourceTrace = {
  sourceId: string;
  sourceName: string;
  sourceType: "news" | "government" | "marketStatistic" | "filing" | "recall" | "disaster";
  sourceUrl: string;
  fetchedAt: string;
  rawRecordId: string;
  licenseNote: string;
  fieldPath: string;
  quote: string;
};

export type DerivationPolicy = {
  summary: string;
  allowedFactTypes: FactType[];
  rules: Array<{
    ruleId: string;
    label: string;
    description: string;
    factType: FactType;
    requiredInputs: string[];
  }>;
};

export type PartialDataNotice = {
  sourceName: string;
  message: string;
  severity: "info" | "warning" | "error";
};

export type ViewContext = {
  eventId: string | null;
  eventName: string | null;
  windowId: string;
  windowLabel: string;
  updatedAt: string;
  viewMode: ViewMode;
};

export type EvidenceCard = {
  evidenceId: string;
  objectType: WatchTargetType;
  objectId: string;
  objectName: string;
  phenomenon: string;
  capturedAt: string;
  sourceName: string;
  sourceType: SourceTrace["sourceType"];
  evidenceLevel: EvidenceLevel;
  factType: FactType;
  boundaryHint: string;
  quoteFields: string[];
  supportsJudgmentIds: string[];
  comparisonHint: string | null;
  sourcePreviewUrl: string;
  sourceTrace: SourceTrace;
};

export type BaseView = {
  sourceTrace: SourceTrace[];
  derivationPolicy: DerivationPolicy;
  partialDataNotice: PartialDataNotice[];
};

export type RadarEventItem = {
  eventId: string;
  title: string;
  summary: string;
  severityLevel: SeverityLevel;
  status: EventStatus;
  themeTags: string[];
  firstObservedAt: string;
  updatedAt: string;
  latestChange: string;
  affectedNodeCount: number;
  affectedCompanyCount: number;
  isInWatchlist: boolean;
  sourceUrl: string;
  factType: FactType;
};

export type RadarView = BaseView & {
  context: ViewContext;
  summary: {
    eventCount: number;
    highSeverityCount: number;
    expandingCount: number;
    watchRelatedCount: number;
  };
  items: RadarEventItem[];
};

export type EventOverviewView = BaseView & {
  context: ViewContext;
  header: {
    eventId: string;
    title: string;
    summary: string;
    source: string;
    occurredAt: string;
    updatedAt: string;
    severityLevel: SeverityLevel;
    status: EventStatus;
    themeTags: string[];
    isInWatchlist: boolean;
    sourceUrl: string;
  };
  overview: {
    judgmentLevel: JudgmentLevel;
    evidenceLevel: EvidenceLevel;
    affectedNodeCount: number;
    affectedCompanyCount: number;
    expandingPathCount: number;
    boundaryHint: string;
    latestWindowChange: string;
  };
  keyAssessments: Array<{
    assessmentId: string;
    targetType: WatchTargetType;
    targetId: string;
    targetName: string;
    judgmentText: string;
    judgmentLevel: JudgmentLevel;
    evidenceLevel: EvidenceLevel;
    evidenceCount: number;
    canNavigateToEvidence: boolean;
  }>;
  pathSummary: {
    primaryPathCount: number;
    secondaryPathCount: number;
    keyNodeIds: string[];
    summaryText: string;
  };
  nextActions: Array<{
    actionId: string;
    label: string;
    href: string;
  }>;
};

export type PropagationMapView = BaseView & {
  context: ViewContext;
  summary: {
    nodeCount: number;
    edgeCount: number;
    primaryPathCount: number;
    expandingNodeCount: number;
    focusNodeId: string | null;
  };
  graph: {
    nodes: Array<{
      nodeId: string;
      nodeName: string;
      nodeType: string;
      riskLevel: SeverityLevel;
      heatScore: number;
      abnormalScore: number;
      isPrimaryPath: boolean;
      isExpanded: boolean;
      upstreamCount: number;
      downstreamCount: number;
      sourceUrl: string;
      factType: FactType;
    }>;
    edges: Array<{
      edgeId: string;
      sourceNodeId: string;
      targetNodeId: string;
      relationType: string;
      strengthScore: number;
      isPrimaryPath: boolean;
      derivationType: DerivationType;
      ruleId: string;
      sourceUrl: string;
    }>;
  };
  timeline: {
    points: Array<{
      pointId: string;
      label: string;
      activeNodeCount: number;
      changedNodeCount: number;
      isCurrent: boolean;
    }>;
  };
  legend: Array<{
    key: string;
    label: string;
    factType: FactType;
  }>;
};

export type NodeExposureView = BaseView & {
  context: ViewContext & {
    nodeId: string;
  };
  nodeCard: {
    nodeId: string;
    nodeName: string;
    nodeType: string;
    riskLevel: SeverityLevel;
    judgmentLevel: JudgmentLevel;
    evidenceLevel: EvidenceLevel;
    firstAbnormalAt: string;
    summary: string;
    boundaryHint: string;
    sourceUrl: string;
    factType: FactType;
  };
  upstreamDownstream: {
    upstreamNodes: Array<NodeMini>;
    downstreamNodes: Array<NodeMini>;
    keyBridgeNodes: Array<NodeMini>;
  };
  exposureGroups: Array<{
    groupKey: "core" | "indirect" | "weak";
    groupLabel: string;
    itemCount: number;
    items: Array<{
      companyId: string;
      companyName: string;
      exposureScore: number;
      exposureLevel: "core" | "indirect" | "weak";
      signalStatus: string;
      isInWatchlist: boolean;
      reason: string;
      factType: FactType;
      sourceUrl: string;
      sourceTrace: SourceTrace;
    }>;
  }>;
  signals: {
    nodeSignals: SignalSeries[];
    companySignals: SignalSeries[];
    trendSummary: string;
  };
  companyPreview: {
    companyId: string;
    companyName: string;
    reason: string;
    sourceUrl: string;
  } | null;
};

export type NodeMini = {
  nodeId: string;
  nodeName: string;
  riskLevel: SeverityLevel;
  relationType: string;
  sourceUrl: string;
};

export type SignalSeries = {
  seriesId: string;
  label: string;
  factType: FactType;
  sourceUrl: string;
  points: Array<{
    date: string;
    value: number;
  }>;
};

export type EvidenceAssessmentView = BaseView & {
  context: ViewContext & {
    targetType: WatchTargetType;
    targetId: string;
  };
  assessment: {
    targetType: WatchTargetType;
    targetId: string;
    targetName: string;
    judgmentText: string;
    judgmentLevel: JudgmentLevel;
    evidenceLevel: EvidenceLevel;
    boundaryHint: string;
    evidenceCount: number;
    lastReviewedAt: string;
  };
  evidenceCards: EvidenceCard[];
  comparison: {
    compareTargetId: string | null;
    compareTargetName: string | null;
    differenceSummary: string;
    sharedEvidenceIds: string[];
    exclusiveEvidenceIds: string[];
  };
  uncertainty: {
    missingEvidenceTypes: string[];
    conflictNote: string | null;
    nextSuggestedAction: string;
  };
  sourcePreviewEnabled: boolean;
};

export type WatchWorkspaceView = BaseView & {
  context: ViewContext;
  summary: {
    watchItemCount: number;
    activeRuleCount: number;
    changedTodayCount: number;
  };
  items: WatchItem[];
  changeFeed: Array<{
    changeId: string;
    watchId: string;
    targetName: string;
    summary: string;
    changedAt: string;
    sourceUrl: string;
  }>;
  ruleSummary: {
    enabledCount: number;
    pausedCount: number;
    defaultWindowLabel: string;
  };
};

export type ConstellationNodeKind = "focusEvent" | "relatedEvent" | "chainNode" | "source";
export type ConstellationRelationKind = "sharedTheme" | "sharedSource" | "temporalLag" | "eventToNode" | "sourceEvidence";

export type EventConstellationView = BaseView & {
  context: ViewContext;
  focusEventId: string | null;
  summary: {
    eventCount: number;
    chainNodeCount: number;
    relationCount: number;
    maxHeatScore: number;
    maxLagDays: number;
    financialSignalCount: number;
    maxZScore: number | null;
    eventWindowLabel: string | null;
  };
  nodes: Array<{
    id: string;
    kind: ConstellationNodeKind;
    label: string;
    eventId: string | null;
    nodeId: string | null;
    severityLevel: SeverityLevel;
    heatScore: number;
    lagDays: number;
    sourceName: string;
    sourceUrl: string;
    factType: FactType;
    financialMetric?: FinancialSignalMetric;
    positionHint: {
      radius: number;
      angle: number;
      layer: number;
    };
  }>;
  relations: Array<{
    id: string;
    sourceId: string;
    targetId: string;
    kind: ConstellationRelationKind;
    label: string;
    strengthScore: number;
    lagDays: number;
    derivationType: DerivationType;
    ruleId: string;
    sourceUrl: string;
  }>;
  heatLegend: Array<{
    label: string;
    minScore: number;
    color: string;
  }>;
  lagLegend: Array<{
    label: string;
    maxLagDays: number;
    color: string;
  }>;
};

export type WatchItem = {
  watchId: string;
  targetType: WatchTargetType;
  targetId: string;
  targetName: string;
  status: "active" | "paused";
  createdAt: string;
  latestSignal: string;
  sourceUrl: string;
};

export type DataSourceDescriptor = {
  sourceName: string;
  sourceType: SourceTrace["sourceType"];
  endpoint: string;
  documentationUrl: string;
  auth: "none" | "optionalKey";
  licenseNote: string;
  lastFetchedAt: string | null;
  status: "ready" | "failed" | "pending";
  errorMessage?: string;
};

export type SnapshotMeta = {
  generatedAt: string;
  sourceCount: number;
  eventCount: number;
  evidenceCount: number;
};

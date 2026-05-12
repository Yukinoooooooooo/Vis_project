import type {
  DataSourceDescriptor,
  DerivationPolicy,
  EventStatus,
  EvidenceCard,
  FinancialSignalMetric,
  EvidenceLevel,
  FactType,
  PartialDataNotice,
  SeverityLevel,
  SignalSeries,
  SourceTrace,
  WatchItem
} from "@risk-map/shared";

export type RiskEvent = {
  eventId: string;
  title: string;
  summary: string;
  severityLevel: SeverityLevel;
  status: EventStatus;
  themeTags: string[];
  firstObservedAt: string;
  updatedAt: string;
  sourceTrace: SourceTrace;
  sourceUrl: string;
  factType: FactType;
  financialMetric?: FinancialSignalMetric;
};

export type RiskNode = {
  nodeId: string;
  eventId: string;
  nodeName: string;
  nodeType: string;
  riskLevel: SeverityLevel;
  heatScore: number;
  abnormalScore: number;
  isPrimaryPath: boolean;
  isExpanded: boolean;
  sourceTrace: SourceTrace;
  sourceUrl: string;
  factType: FactType;
  financialMetric?: FinancialSignalMetric;
};

export type RiskEdge = {
  edgeId: string;
  eventId: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: string;
  strengthScore: number;
  isPrimaryPath: boolean;
  derivationType: FactType;
  ruleId: string;
  sourceUrl: string;
  sourceTrace: SourceTrace;
};

export type ExposureItem = {
  eventId: string;
  nodeId: string;
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
};

export type Assessment = {
  assessmentId: string;
  eventId: string;
  targetType: "event" | "node" | "company";
  targetId: string;
  targetName: string;
  judgmentText: string;
  judgmentLevel: "J1" | "J2" | "J3" | "J4";
  evidenceLevel: EvidenceLevel;
  boundaryHint: string;
  evidenceIds: string[];
  sourceTrace: SourceTrace;
};

export type RiskSnapshot = {
  generatedAt: string;
  windowId: string;
  windowLabel: string;
  sources: DataSourceDescriptor[];
  notices: PartialDataNotice[];
  derivationPolicy: DerivationPolicy;
  events: RiskEvent[];
  nodes: RiskNode[];
  edges: RiskEdge[];
  exposures: ExposureItem[];
  evidenceCards: EvidenceCard[];
  assessments: Assessment[];
  signals: SignalSeries[];
  watchItems: WatchItem[];
};


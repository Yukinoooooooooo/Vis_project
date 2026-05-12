import type { DataSourceDescriptor, PartialDataNotice, SourceTrace } from "@risk-map/shared";

export type QuotedField = {
  fieldPath: string;
  value: string;
};

export type SourceRecord = {
  id: string;
  sourceName: string;
  sourceType: SourceTrace["sourceType"];
  sourceUrl: string;
  fetchedAt: string;
  rawRecordId: string;
  licenseNote: string;
  title: string;
  summary: string;
  occurredAt: string;
  updatedAt: string;
  tags: string[];
  severityHint: "low" | "medium" | "high" | "critical";
  statusHint: "new" | "tracking" | "expanding" | "stabilizing" | "closed";
  primaryEntityName: string | null;
  productOrCommodityName: string | null;
  regionName: string | null;
  quotedFields: QuotedField[];
  rawFields: Record<string, unknown>;
};

export type ConnectorResult = {
  descriptor: DataSourceDescriptor;
  records: SourceRecord[];
  notice?: PartialDataNotice;
};

export type Connector = {
  descriptor: Omit<DataSourceDescriptor, "lastFetchedAt" | "status" | "errorMessage">;
  fetchRecords: () => Promise<SourceRecord[]>;
};


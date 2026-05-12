import { compactText, fetchJson, isoNow, safeText } from "./http";
import type { Connector, SourceRecord } from "./types";

type FdaRecall = {
  recall_number?: string;
  reason_for_recall?: string;
  product_description?: string;
  recalling_firm?: string;
  classification?: string;
  report_date?: string;
  recall_initiation_date?: string;
  distribution_pattern?: string;
  status?: string;
};

type FdaResponse = {
  results?: FdaRecall[];
};

const endpoint = "https://api.fda.gov/drug/enforcement.json?limit=10&sort=report_date:desc";

export const openFdaConnector: Connector = {
  descriptor: {
    sourceName: "openFDA Drug Enforcement",
    sourceType: "recall",
    endpoint,
    documentationUrl: "https://open.fda.gov/apis/drug/enforcement/",
    auth: "none",
    licenseNote: "openFDA provides public FDA enforcement report data; verify original FDA notices for operational use."
  },
  async fetchRecords() {
    const fetchedAt = isoNow();
    const payload = await fetchJson<FdaResponse>(endpoint);
    return parseOpenFda(payload, fetchedAt);
  }
};

export function parseOpenFda(payload: FdaResponse, fetchedAt: string): SourceRecord[] {
  return (payload.results ?? []).filter((item) => item.recall_number).map((item) => {
    const recallNumber = safeText(item.recall_number);
    const firm = safeText(item.recalling_firm, "firm not provided");
    const product = safeText(item.product_description, "product not provided");
    const reason = safeText(item.reason_for_recall, "reason not provided");
    const classification = safeText(item.classification, "not classified");
    const reportDate = parseDate(item.report_date) ?? fetchedAt;
    const sourceUrl = `https://api.fda.gov/drug/enforcement.json?search=recall_number:%22${encodeURIComponent(recallNumber)}%22`;

    return {
      id: `openfda_${recallNumber}`,
      sourceName: openFdaConnector.descriptor.sourceName,
      sourceType: openFdaConnector.descriptor.sourceType,
      sourceUrl,
      fetchedAt,
      rawRecordId: recallNumber,
      licenseNote: openFdaConnector.descriptor.licenseNote,
      title: `${firm} 药品召回：${compactText(product, 80)}`,
      summary: compactText(reason),
      occurredAt: parseDate(item.recall_initiation_date) ?? reportDate,
      updatedAt: reportDate,
      tags: ["openfda", "drug-recall", classification, safeText(item.status, "status-unknown")],
      severityHint: classification.toLowerCase().includes("class i") ? "critical" : classification.toLowerCase().includes("class ii") ? "high" : "medium",
      statusHint: safeText(item.status).toLowerCase().includes("ongoing") ? "expanding" : "tracking",
      primaryEntityName: firm,
      productOrCommodityName: product,
      regionName: safeText(item.distribution_pattern, "distribution not provided"),
      quotedFields: [
        { fieldPath: "results[].recalling_firm", value: firm },
        { fieldPath: "results[].product_description", value: product },
        { fieldPath: "results[].reason_for_recall", value: reason },
        { fieldPath: "results[].classification", value: classification }
      ],
      rawFields: item as Record<string, unknown>
    };
  });
}

function parseDate(value: string | undefined): string | null {
  if (!value || !/^\d{8}$/.test(value)) return null;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00.000Z`;
}


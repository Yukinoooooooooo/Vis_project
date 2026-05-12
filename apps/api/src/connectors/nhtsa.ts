import { compactText, fetchJson, isoNow, safeText } from "./http";
import type { Connector, SourceRecord } from "./types";

type NhtsaRecall = {
  NHTSACampaignNumber?: string;
  Manufacturer?: string;
  Component?: string;
  Summary?: string;
  Consequence?: string;
  ReportReceivedDate?: string;
  Remedy?: string;
  ModelYear?: string;
  Make?: string;
  Model?: string;
};

type NhtsaResponse = {
  results?: NhtsaRecall[];
};

const endpoint = "https://api.nhtsa.gov/recalls/recallsByVehicle?make=Tesla&model=Model%20Y&modelYear=2024";

export const nhtsaConnector: Connector = {
  descriptor: {
    sourceName: "NHTSA Vehicle Recalls",
    sourceType: "recall",
    endpoint,
    documentationUrl: "https://www.nhtsa.gov/nhtsa-datasets-and-apis",
    auth: "none",
    licenseNote: "NHTSA recall APIs expose public U.S. vehicle safety recall data."
  },
  async fetchRecords() {
    const fetchedAt = isoNow();
    const payload = await fetchJson<NhtsaResponse>(endpoint);
    return parseNhtsa(payload, fetchedAt);
  }
};

export function parseNhtsa(payload: NhtsaResponse, fetchedAt: string): SourceRecord[] {
  return (payload.results ?? []).filter((item) => item.NHTSACampaignNumber).map((item) => {
    const campaign = safeText(item.NHTSACampaignNumber);
    const manufacturer = safeText(item.Manufacturer, "manufacturer not provided");
    const component = safeText(item.Component, "component not provided");
    const vehicle = `${safeText(item.ModelYear)} ${safeText(item.Make)} ${safeText(item.Model)}`.trim();
    const title = `${manufacturer} 车辆召回：${component}`;
    const sourceUrl = `https://api.nhtsa.gov/recalls/recallsByCampaignNumber?campaignNumber=${encodeURIComponent(campaign)}`;

    return {
      id: `nhtsa_${campaign}`,
      sourceName: nhtsaConnector.descriptor.sourceName,
      sourceType: nhtsaConnector.descriptor.sourceType,
      sourceUrl,
      fetchedAt,
      rawRecordId: campaign,
      licenseNote: nhtsaConnector.descriptor.licenseNote,
      title,
      summary: compactText(`${safeText(item.Summary)} ${safeText(item.Consequence)}`),
      occurredAt: parseNhtsaDate(item.ReportReceivedDate) ?? fetchedAt,
      updatedAt: fetchedAt,
      tags: ["nhtsa", "vehicle-recall", component, vehicle],
      severityHint: "high",
      statusHint: "tracking",
      primaryEntityName: manufacturer,
      productOrCommodityName: component,
      regionName: "United States",
      quotedFields: [
        { fieldPath: "results[].Manufacturer", value: manufacturer },
        { fieldPath: "results[].Component", value: component },
        { fieldPath: "results[].Summary", value: compactText(safeText(item.Summary), 180) }
      ],
      rawFields: item as Record<string, unknown>
    };
  });
}

function parseNhtsaDate(value: string | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}


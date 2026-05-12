import { compactText, fetchJson, isoNow, safeText } from "./http";
import type { Connector, SourceRecord } from "./types";

type ReliefWebItem = {
  id?: string;
  href?: string;
  fields?: {
    name?: string;
    status?: string;
    type?: Array<{ name?: string }>;
    country?: Array<{ name?: string }>;
    date?: {
      created?: string;
    };
    url?: string;
  };
};

type ReliefWebResponse = {
  data?: ReliefWebItem[];
};

const endpoint =
  "https://api.reliefweb.int/v2/disasters?appname=industry-risk-map&limit=8&preset=latest&fields[include][]=name&fields[include][]=status&fields[include][]=type&fields[include][]=country&fields[include][]=date&fields[include][]=url";

export const reliefWebConnector: Connector = {
  descriptor: {
    sourceName: "ReliefWeb Disasters",
    sourceType: "disaster",
    endpoint,
    documentationUrl: "https://apidoc.reliefweb.int/v0/index.html",
    auth: "none",
    licenseNote: "ReliefWeb API exposes public humanitarian disaster metadata with source-specific licensing."
  },
  async fetchRecords() {
    const fetchedAt = isoNow();
    const payload = await fetchJson<ReliefWebResponse>(endpoint);
    return parseReliefWeb(payload, fetchedAt);
  }
};

export function parseReliefWeb(payload: ReliefWebResponse, fetchedAt: string): SourceRecord[] {
  return (payload.data ?? []).map((item) => {
    const fields = item.fields ?? {};
    const name = safeText(fields.name, "ReliefWeb disaster");
    const type = fields.type?.map((entry) => safeText(entry.name)).filter(Boolean).join(", ") || "disaster";
    const country = fields.country?.map((entry) => safeText(entry.name)).filter(Boolean).join(", ") || "region not provided";
    const sourceUrl = fields.url ?? item.href ?? reliefWebConnector.descriptor.endpoint;

    return {
      id: `reliefweb_${item.id ?? hashKey(name)}`,
      sourceName: reliefWebConnector.descriptor.sourceName,
      sourceType: reliefWebConnector.descriptor.sourceType,
      sourceUrl,
      fetchedAt,
      rawRecordId: item.id ?? name,
      licenseNote: reliefWebConnector.descriptor.licenseNote,
      title: name,
      summary: compactText(`ReliefWeb 最新灾害记录：${type}，地区：${country}。`),
      occurredAt: fields.date?.created ?? fetchedAt,
      updatedAt: fetchedAt,
      tags: ["reliefweb", type, country],
      severityHint: "high",
      statusHint: safeText(fields.status).toLowerCase().includes("current") ? "expanding" : "tracking",
      primaryEntityName: type,
      productOrCommodityName: "regional supply chain",
      regionName: country,
      quotedFields: [
        { fieldPath: "fields.name", value: name },
        { fieldPath: "fields.type[].name", value: type },
        { fieldPath: "fields.country[].name", value: country }
      ],
      rawFields: item as unknown as Record<string, unknown>
    };
  });
}

function hashKey(input: string): string {
  let hash = 0;
  for (const char of input) hash = (hash * 37 + char.charCodeAt(0)) >>> 0;
  return hash.toString(16);
}

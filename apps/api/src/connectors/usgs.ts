import { compactText, fetchJson, isoNow, safeText } from "./http";
import type { Connector, SourceRecord } from "./types";

type UsgsFeature = {
  id?: string;
  properties?: {
    title?: string;
    place?: string;
    mag?: number;
    time?: number;
    updated?: number;
    url?: string;
    type?: string;
  };
};

type UsgsResponse = {
  features?: UsgsFeature[];
};

const endpoint = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson";

export const usgsConnector: Connector = {
  descriptor: {
    sourceName: "USGS Earthquake GeoJSON",
    sourceType: "disaster",
    endpoint,
    documentationUrl: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php",
    auth: "none",
    licenseNote: "USGS earthquake feeds are public U.S. government data."
  },
  async fetchRecords() {
    const fetchedAt = isoNow();
    const payload = await fetchJson<UsgsResponse>(endpoint);
    return parseUsgs(payload, fetchedAt);
  }
};

export function parseUsgs(payload: UsgsResponse, fetchedAt: string): SourceRecord[] {
  return (payload.features ?? []).slice(0, 8).map((feature) => {
    const props = feature.properties ?? {};
    const magnitude = typeof props.mag === "number" ? props.mag : 0;
    const place = safeText(props.place, "location not provided");
    const title = safeText(props.title, `M${magnitude} earthquake`);
    const occurredAt = typeof props.time === "number" ? new Date(props.time).toISOString() : fetchedAt;

    return {
      id: `usgs_${feature.id ?? hashKey(title)}`,
      sourceName: usgsConnector.descriptor.sourceName,
      sourceType: usgsConnector.descriptor.sourceType,
      sourceUrl: props.url ?? usgsConnector.descriptor.endpoint,
      fetchedAt,
      rawRecordId: feature.id ?? title,
      licenseNote: usgsConnector.descriptor.licenseNote,
      title,
      summary: compactText(`USGS 记录到 ${place} 附近发生 ${magnitude} 级地震，可能影响当地物流、港口、能源或制造节点。`),
      occurredAt,
      updatedAt: typeof props.updated === "number" ? new Date(props.updated).toISOString() : fetchedAt,
      tags: ["earthquake", "usgs", place],
      severityHint: magnitude >= 7 ? "critical" : magnitude >= 6 ? "high" : "medium",
      statusHint: "tracking",
      primaryEntityName: "USGS earthquake event",
      productOrCommodityName: "regional logistics",
      regionName: place,
      quotedFields: [
        { fieldPath: "properties.title", value: title },
        { fieldPath: "properties.mag", value: String(magnitude) },
        { fieldPath: "properties.place", value: place }
      ],
      rawFields: feature as unknown as Record<string, unknown>
    };
  });
}

function hashKey(input: string): string {
  let hash = 0;
  for (const char of input) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return hash.toString(16);
}


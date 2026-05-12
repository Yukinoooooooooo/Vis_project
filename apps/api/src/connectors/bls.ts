import { compactText, fetchJson, isoNow, safeText } from "./http";
import type { Connector, SourceRecord } from "./types";

type BlsResponse = {
  status?: string;
  Results?: {
    series?: Array<{
      seriesID?: string;
      data?: Array<{
        year?: string;
        period?: string;
        periodName?: string;
        value?: string;
      }>;
    }>;
  };
};

const endpoint = "https://api.bls.gov/publicAPI/v2/timeseries/data/";
const seriesId = "PCU336111336111";

export const blsConnector: Connector = {
  descriptor: {
    sourceName: "BLS Public Data API",
    sourceType: "marketStatistic",
    endpoint,
    documentationUrl: "https://www.bls.gov/bls/api_feature_article.htm",
    auth: "none",
    licenseNote: "BLS public data API provides U.S. government labor and price statistics."
  },
  async fetchRecords() {
    const fetchedAt = isoNow();
    const payload = await fetchJson<BlsResponse>(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seriesid: [seriesId],
        latest: true
      })
    });
    return parseBls(payload, fetchedAt);
  }
};

export function parseBls(payload: BlsResponse, fetchedAt: string): SourceRecord[] {
  const series = payload.Results?.series?.[0];
  const points = series?.data ?? [];
  if (!series?.seriesID || points.length === 0) return [];
  const latest = points[0];
  const previous = points[1];
  const latestValue = Number(latest?.value ?? 0);
  const previousValue = Number(previous?.value ?? latestValue);
  const delta = latestValue - previousValue;
  const period = `${safeText(latest?.year)} ${safeText(latest?.periodName ?? latest?.period)}`.trim();

  return [
    {
      id: `bls_${series.seriesID}_${safeText(latest?.year)}_${safeText(latest?.period)}`,
      sourceName: blsConnector.descriptor.sourceName,
      sourceType: blsConnector.descriptor.sourceType,
      sourceUrl: `${blsConnector.descriptor.endpoint}?seriesid=${series.seriesID}`,
      fetchedAt,
      rawRecordId: `${series.seriesID}_${period}`,
      licenseNote: blsConnector.descriptor.licenseNote,
      title: `BLS PPI 序列 ${series.seriesID} 最新值`,
      summary: compactText(`BLS 序列 ${series.seriesID} 在 ${period} 的最新值为 ${latestValue}，较上一期变化 ${delta.toFixed(2)}。`),
      occurredAt: `${safeText(latest?.year, fetchedAt.slice(0, 4))}-01-01T00:00:00.000Z`,
      updatedAt: fetchedAt,
      tags: ["bls", "ppi", series.seriesID],
      severityHint: Math.abs(delta) > 5 ? "high" : "medium",
      statusHint: "tracking",
      primaryEntityName: "Automobile manufacturing price index",
      productOrCommodityName: "automobiles",
      regionName: "United States",
      quotedFields: [
        { fieldPath: "Results.series[0].seriesID", value: series.seriesID },
        { fieldPath: "Results.series[0].data[0].value", value: String(latestValue) },
        { fieldPath: "computed.delta", value: delta.toFixed(2) }
      ],
      rawFields: series as unknown as Record<string, unknown>
    }
  ];
}


import { compactText, fetchJson, isoNow, safeText } from "./http";
import type { Connector, SourceRecord } from "./types";

type CensusResponse = string[][];

const endpoint =
  "https://api.census.gov/data/timeseries/intltrade/imports/hs?get=CTY_NAME,I_COMMODITY,I_COMMODITY_LDESC,GEN_VAL_MO&time=2025-12&I_COMMODITY=8542";

export const censusConnector: Connector = {
  descriptor: {
    sourceName: "U.S. Census International Trade",
    sourceType: "government",
    endpoint,
    documentationUrl: "https://www.census.gov/data/developers/data-sets/international-trade.html",
    auth: "none",
    licenseNote: "U.S. Census API provides public U.S. government trade statistics."
  },
  async fetchRecords() {
    const fetchedAt = isoNow();
    const payload = await fetchJson<CensusResponse>(endpoint);
    return parseCensus(payload, fetchedAt);
  }
};

export function parseCensus(payload: CensusResponse, fetchedAt: string): SourceRecord[] {
  const [header, ...rows] = payload;
  if (!header) return [];
  const indexes = Object.fromEntries(header.map((field, index) => [field, index] as const));

  return rows.slice(0, 10).map((row, index) => {
    const country = safeText(row[indexes.CTY_NAME ?? -1], "country not provided");
    const commodity = safeText(row[indexes.I_COMMODITY_LDESC ?? -1], "commodity not provided");
    const hs = safeText(row[indexes.I_COMMODITY ?? -1], "HS unknown");
    const value = safeText(row[indexes.GEN_VAL_MO ?? -1], "0");
    const title = `美国进口商品 ${hs}：${commodity}`;

    return {
      id: `census_import_${hs}_${index}`,
      sourceName: censusConnector.descriptor.sourceName,
      sourceType: censusConnector.descriptor.sourceType,
      sourceUrl: censusConnector.descriptor.endpoint,
      fetchedAt,
      rawRecordId: `${hs}_${country}_${index}`,
      licenseNote: censusConnector.descriptor.licenseNote,
      title,
      summary: compactText(`Census 国际贸易 API 返回美国从 ${country} 进口 ${commodity} 的月度统计值 ${value}。`),
      occurredAt: fetchedAt,
      updatedAt: fetchedAt,
      tags: ["trade", "imports", hs, country],
      severityHint: "medium",
      statusHint: "tracking",
      primaryEntityName: country,
      productOrCommodityName: commodity,
      regionName: country,
      quotedFields: [
        { fieldPath: "CTY_NAME", value: country },
        { fieldPath: "I_COMMODITY_LDESC", value: commodity },
        { fieldPath: "GEN_VAL_MO", value }
      ],
      rawFields: { header, row }
    };
  });
}

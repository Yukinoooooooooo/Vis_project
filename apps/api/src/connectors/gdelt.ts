import { compactText, fetchJson, isoNow, safeText } from "./http";
import type { Connector, SourceRecord } from "./types";

type GdeltArticle = {
  url?: string;
  url_mobile?: string;
  title?: string;
  seendate?: string;
  socialimage?: string;
  domain?: string;
  sourcecountry?: string;
  language?: string;
};

type GdeltResponse = {
  articles?: GdeltArticle[];
};

const endpoint =
  "https://api.gdeltproject.org/api/v2/doc/doc?query=supply%20chain&mode=artlist&format=json&maxrecords=12&sort=datedesc";

export const gdeltConnector: Connector = {
  descriptor: {
    sourceName: "GDELT DOC 2.0",
    sourceType: "news",
    endpoint,
    documentationUrl: "https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/amp/",
    auth: "none",
    licenseNote: "GDELT is a public global news metadata project; article copyright remains with source publishers."
  },
  async fetchRecords() {
    const fetchedAt = isoNow();
    const payload = await fetchJson<GdeltResponse>(endpoint, {}, 25000);
    return parseGdelt(payload, fetchedAt);
  }
};

export function parseGdelt(payload: GdeltResponse, fetchedAt: string): SourceRecord[] {
  const articles = payload.articles ?? [];
  return articles
    .filter((article) => article.url && article.title)
    .map((article, index) => {
      const sourceUrl = article.url ?? article.url_mobile ?? gdeltConnector.descriptor.endpoint;
      const title = compactText(safeText(article.title), 180);
      const domain = safeText(article.domain, "unknown source");
      const country = safeText(article.sourcecountry, "global");
      const date = normalizeGdeltDate(article.seendate) ?? fetchedAt;

      return {
        id: `gdelt_${hashKey(sourceUrl)}_${index}`,
        sourceName: gdeltConnector.descriptor.sourceName,
        sourceType: gdeltConnector.descriptor.sourceType,
        sourceUrl,
        fetchedAt,
        rawRecordId: sourceUrl,
        licenseNote: gdeltConnector.descriptor.licenseNote,
        title,
        summary: `新闻来源 ${domain} 报道了与供应链、召回、短缺或扰动相关的公开信息。`,
        occurredAt: date,
        updatedAt: fetchedAt,
        tags: ["news", country, safeText(article.language, "unknown-language")].filter(Boolean),
        severityHint: "medium",
        statusHint: "tracking",
        primaryEntityName: domain,
        productOrCommodityName: inferKeyword(title),
        regionName: country,
        quotedFields: [
          { fieldPath: "articles[].title", value: title },
          { fieldPath: "articles[].domain", value: domain },
          { fieldPath: "articles[].sourcecountry", value: country }
        ],
        rawFields: article as Record<string, unknown>
      };
    });
}

function normalizeGdeltDate(value: string | undefined): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`;
}

function inferKeyword(title: string): string | null {
  const candidates = ["semiconductor", "battery", "drug", "food", "vehicle", "energy", "port", "shipping"];
  const lower = title.toLowerCase();
  return candidates.find((candidate) => lower.includes(candidate)) ?? null;
}

function hashKey(input: string): string {
  let hash = 0;
  for (const char of input) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash.toString(16);
}

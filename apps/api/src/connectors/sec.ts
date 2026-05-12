import { apiConfig } from "../config";
import { compactText, fetchJson, isoNow, safeText } from "./http";
import type { Connector, SourceRecord } from "./types";

type SecSubmission = {
  name?: string;
  cik?: string;
  sicDescription?: string;
  tickers?: string[];
  exchanges?: string[];
  filings?: {
    recent?: {
      accessionNumber?: string[];
      filingDate?: string[];
      reportDate?: string[];
      form?: string[];
      primaryDocument?: string[];
    };
  };
};

const cik = "0000320193";
const endpoint = `https://data.sec.gov/submissions/CIK${cik}.json`;

export const secConnector: Connector = {
  descriptor: {
    sourceName: "SEC EDGAR Submissions",
    sourceType: "filing",
    endpoint,
    documentationUrl: "https://www.sec.gov/edgar/sec-api-documentation",
    auth: "none",
    licenseNote: "SEC EDGAR public company submissions; comply with SEC fair access and User-Agent guidance."
  },
  async fetchRecords() {
    const fetchedAt = isoNow();
    const payload = await fetchJson<SecSubmission>(endpoint, {
      headers: {
        "User-Agent": apiConfig.secUserAgent
      }
    });
    return parseSecSubmission(payload, fetchedAt);
  }
};

export function parseSecSubmission(payload: SecSubmission, fetchedAt: string): SourceRecord[] {
  const companyName = safeText(payload.name, "Unknown company");
  const recent = payload.filings?.recent;
  const accession = recent?.accessionNumber?.[0];
  if (!accession) return [];

  const filingDate = recent?.filingDate?.[0] ?? fetchedAt.slice(0, 10);
  const form = recent?.form?.[0] ?? "filing";
  const primaryDocument = recent?.primaryDocument?.[0] ?? "";
  const accessionNoDash = accession.replaceAll("-", "");
  const filingUrl = `https://www.sec.gov/Archives/edgar/data/${Number(payload.cik ?? cik)}/${accessionNoDash}/${primaryDocument}`;

  return [
    {
      id: `sec_${payload.cik ?? cik}_${accession}`,
      sourceName: secConnector.descriptor.sourceName,
      sourceType: secConnector.descriptor.sourceType,
      sourceUrl: filingUrl,
      fetchedAt,
      rawRecordId: accession,
      licenseNote: secConnector.descriptor.licenseNote,
      title: `${companyName} 最新 SEC ${form} 披露`,
      summary: compactText(
        `${companyName} (${(payload.tickers ?? []).join(", ") || "no ticker"}) 在 SEC EDGAR 中有最新 ${form} 披露。行业描述：${safeText(payload.sicDescription, "未提供")}.`
      ),
      occurredAt: `${filingDate}T00:00:00.000Z`,
      updatedAt: fetchedAt,
      tags: ["sec", form, safeText(payload.sicDescription, "industry-unknown")],
      severityHint: "low",
      statusHint: "tracking",
      primaryEntityName: companyName,
      productOrCommodityName: safeText(payload.sicDescription, null as unknown as string) || null,
      regionName: "United States",
      quotedFields: [
        { fieldPath: "name", value: companyName },
        { fieldPath: "filings.recent.form[0]", value: form },
        { fieldPath: "sicDescription", value: safeText(payload.sicDescription, "not provided") }
      ],
      rawFields: payload as Record<string, unknown>
    }
  ];
}


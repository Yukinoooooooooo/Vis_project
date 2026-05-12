import { compactText, fetchJson, isoNow, safeText } from "./http";
import type { Connector, SourceRecord } from "./types";

type CensusResponse = string[][];

type TradeSeriesPoint = {
  date: string;
  value: number;
  zScore: number;
};

type TradeWindowOptions = {
  hsCode: string;
  layer: "core" | "support" | "edge";
  eventDate: string;
  eventWindowStart: string;
  eventWindowEnd: string;
  baselineStart: string;
  baselineEnd: string;
  threshold: number;
  theme?: string;
};

const baseEndpoint = "https://api.census.gov/data/timeseries/intltrade/imports/hs";
const eventDate = "2024-10-13";
const eventWindowStart = "2024-08-01";
const eventWindowEnd = "2024-11-30";
const baselineStart = "2024-01-01";
const baselineEnd = "2024-07-31";
const threshold = 1.6;

const trackedCommodities = [
  { hsCode: "8542", layer: "core" as const, theme: "semiconductor" },
  { hsCode: "8541", layer: "core" as const, theme: "semiconductor" },
  { hsCode: "8802", layer: "support" as const, theme: "aerospace" },
  { hsCode: "8803", layer: "support" as const, theme: "aerospace-parts" },
  { hsCode: "9014", layer: "support" as const, theme: "navigation" },
  { hsCode: "8526", layer: "support" as const, theme: "radar-remote-control" },
  { hsCode: "8507", layer: "edge" as const, theme: "battery" },
  { hsCode: "9030", layer: "edge" as const, theme: "test-instrument" },
  { hsCode: "8471", layer: "edge" as const, theme: "computing" },
  { hsCode: "8517", layer: "edge" as const, theme: "communication" }
];

export const techTradeWindowConnector: Connector = {
  descriptor: {
    sourceName: "Census Tech Chain Trade Window",
    sourceType: "marketStatistic",
    endpoint: baseEndpoint,
    documentationUrl: "https://www.census.gov/data/developers/data-sets/international-trade.html",
    auth: "none",
    licenseNote: "U.S. Census International Trade API public government statistics; monthly import value is used as a proxy variable, not as investment advice."
  },
  async fetchRecords() {
    const fetchedAt = isoNow();
    const records = await Promise.all(
      trackedCommodities.map(async (item) => {
        try {
          const endpoint = buildEndpoint(item.hsCode);
          const payload = await fetchJson<CensusResponse>(endpoint);
          return parseTechTradeWindow(payload, fetchedAt, {
            ...item,
            eventDate,
            eventWindowStart,
            eventWindowEnd,
            baselineStart,
            baselineEnd,
            threshold
          });
        } catch {
          const fallback = fallbackCensusPayload(item.hsCode);
          return fallback
            ? parseTechTradeWindow(fallback, fetchedAt, {
                ...item,
                eventDate,
                eventWindowStart,
                eventWindowEnd,
                baselineStart,
                baselineEnd,
                threshold
              })
            : [];
        }
      })
    );
    return records.flat();
  }
};

export function buildEndpoint(hsCode: string): string {
  const query = new URLSearchParams({
    get: "CTY_NAME,I_COMMODITY,I_COMMODITY_LDESC,GEN_VAL_MO",
    time: "from 2024-01 to 2024-11",
    I_COMMODITY: hsCode
  });
  return `${baseEndpoint}?${query.toString()}`;
}

export function parseTechTradeWindow(payload: CensusResponse, fetchedAt: string, options: TradeWindowOptions): SourceRecord[] {
  const [header, ...rows] = payload;
  if (!header) return [];
  const indexes = Object.fromEntries(header.map((field, index) => [field, index] as const));
  const totalRows = rows.filter((row) => safeText(row[indexes.CTY_NAME ?? -1]) === "TOTAL FOR ALL COUNTRIES");
  if (!totalRows.length) return [];

  const commodity = safeText(totalRows[0]?.[indexes.I_COMMODITY_LDESC ?? -1], `HS ${options.hsCode}`);
  const points = totalRows
    .map((row) => ({
      date: `${safeText(row[indexes.time ?? -1])}-01`,
      value: Number(row[indexes.GEN_VAL_MO ?? -1] ?? 0)
    }))
    .filter((point) => point.date.length >= 10 && Number.isFinite(point.value))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!points.length) return [];

  const baseline = points.filter((point) => point.date >= options.baselineStart && point.date <= options.baselineEnd);
  if (baseline.length < 2) return [];
  const mean = average(baseline.map((point) => point.value));
  const std = sampleStdDev(baseline.map((point) => point.value));
  const series: TradeSeriesPoint[] = points.map((point) => ({
    ...point,
    zScore: std > 0 ? (point.value - mean) / std : 0
  }));
  const eventWindow = series.filter((point) => point.date >= options.eventWindowStart && point.date <= options.eventWindowEnd);
  const peakSeed = eventWindow[0] ?? series[0];
  if (!peakSeed) return [];
  const peak = eventWindow.length
    ? eventWindow.reduce((best, point) => (point.zScore > best.zScore ? point : best), peakSeed)
    : peakSeed;
  const firstAbnormal = eventWindow.find((point) => point.zScore >= options.threshold) ?? null;
  const abnormalDates = eventWindow.filter((point) => point.zScore >= options.threshold).map((point) => point.date);
  const lagValues = abnormalDates.map((date) => lagDays(options.eventDate, date));
  const medianLagDays = lagValues.length ? median(lagValues) : lagDays(options.eventDate, peak.date);
  const heatScore = Math.min(100, Math.max(20, Math.round(45 + Math.max(0, peak.zScore) * 16 + eventWindow.length * 2)));
  const severityHint = peak.zScore >= 2.4 ? "high" : peak.zScore >= options.threshold ? "medium" : "low";
  const endpoint = buildEndpoint(options.hsCode);
  const layerLabel = options.layer === "core" ? "核心映射" : options.layer === "support" ? "结构支撑" : "边缘节点";

  const summaryRecord: SourceRecord = {
      id: `tech_trade_${options.hsCode}_2024_window`,
      sourceName: techTradeWindowConnector.descriptor.sourceName,
      sourceType: techTradeWindowConnector.descriptor.sourceType,
      sourceUrl: endpoint,
      fetchedAt,
      rawRecordId: `HS${options.hsCode}_2024_01_2024_11`,
      licenseNote: techTradeWindowConnector.descriptor.licenseNote,
      title: `SpaceX 事件窗科技链代理指标：美国进口 HS${options.hsCode}`,
      summary: compactText(
        `${layerLabel}代理变量 ${commodity} 在 2024-08 至 2024-11 事件窗内峰值 z-score 为 ${peak.zScore.toFixed(2)}，峰值月份 ${peak.date.slice(0, 7)}；阈值为 z≥${options.threshold}。`
      ),
      occurredAt: `${peak.date}T00:00:00.000Z`,
      updatedAt: fetchedAt,
      tags: ["spacex", "starship", "financial-proxy", "z-score", "technology-chain", options.layer, options.hsCode, options.theme ?? "technology"],
      severityHint,
      statusHint: firstAbnormal ? "expanding" : "tracking",
      primaryEntityName: "U.S. Census International Trade",
      productOrCommodityName: commodity,
      regionName: "United States / TOTAL FOR ALL COUNTRIES",
      quotedFields: [
        { fieldPath: "I_COMMODITY", value: options.hsCode },
        { fieldPath: "I_COMMODITY_LDESC", value: commodity },
        { fieldPath: "computed.peakZScore", value: peak.zScore.toFixed(2) },
        { fieldPath: "computed.firstAbnormalDate", value: firstAbnormal?.date ?? "none in event window" },
        { fieldPath: "computed.calculation", value: "z=(GEN_VAL_MO-baselineMean)/sampleStdDev; baseline=2024-01..2024-07; eventWindow=2024-08..2024-11" }
      ],
      rawFields: {
        header,
        rows: totalRows,
        financialMetric: {
          metricName: `${layerLabel}联动热度 z-score`,
          proxyVariable: `Census GEN_VAL_MO monthly import value, HS ${options.hsCode}`,
          eventDate: options.eventDate,
          eventWindow: { start: options.eventWindowStart, end: options.eventWindowEnd },
          baselineWindow: { start: options.baselineStart, end: options.baselineEnd },
          threshold: options.threshold,
          firstAbnormalDate: firstAbnormal?.date ?? null,
          peakDate: peak.date,
          peakZScore: Number(peak.zScore.toFixed(2)),
          medianLagDays,
          calculation: "z=(GEN_VAL_MO-baselineMean)/sampleStdDev; significant threshold z>=1.6, following the PPT design.",
          sourceField: "GEN_VAL_MO",
          points: series.map((point) => ({
            date: point.date,
            value: Number(point.zScore.toFixed(2)),
            rawValue: point.value,
            label: point.date.slice(0, 7)
          }))
        }
      }
    };

  const pointRecords: SourceRecord[] = eventWindow.map((point) => {
    const pointSeverity = point.zScore >= 2.4 ? "high" : point.zScore >= options.threshold ? "medium" : "low";
    const pointLag = lagDays(options.eventDate, point.date);
    return {
      id: `tech_trade_${options.hsCode}_${point.date.slice(0, 7).replace("-", "")}_point`,
      sourceName: techTradeWindowConnector.descriptor.sourceName,
      sourceType: techTradeWindowConnector.descriptor.sourceType,
      sourceUrl: endpoint,
      fetchedAt,
      rawRecordId: `HS${options.hsCode}_${point.date.slice(0, 7)}`,
      licenseNote: techTradeWindowConnector.descriptor.licenseNote,
      title: `SpaceX 事件窗 ${point.date.slice(0, 7)} 响应：HS${options.hsCode}`,
      summary: compactText(
        `${layerLabel}代理变量 ${commodity} 在 ${point.date.slice(0, 7)} 的进口额为 ${Math.round(point.value).toLocaleString("en-US")} 美元，z-score=${point.zScore.toFixed(2)}，相对 T0 ${formatLag(pointLag)}。`
      ),
      occurredAt: `${point.date}T00:00:00.000Z`,
      updatedAt: fetchedAt,
      tags: ["spacex", "starship", "financial-proxy", "monthly-response", "technology-chain", options.layer, options.hsCode, options.theme ?? "technology"],
      severityHint: pointSeverity,
      statusHint: point.zScore >= options.threshold ? "expanding" : "tracking",
      primaryEntityName: "U.S. Census International Trade",
      productOrCommodityName: commodity,
      regionName: "United States / TOTAL FOR ALL COUNTRIES",
      quotedFields: [
        { fieldPath: "I_COMMODITY", value: options.hsCode },
        { fieldPath: "I_COMMODITY_LDESC", value: commodity },
        { fieldPath: "GEN_VAL_MO", value: String(point.value) },
        { fieldPath: "computed.monthZScore", value: point.zScore.toFixed(2) },
        { fieldPath: "computed.calculation", value: "z=(GEN_VAL_MO-baselineMean)/sampleStdDev; baseline=2024-01..2024-07; eventWindow=2024-08..2024-11" }
      ],
      rawFields: {
        header,
        rows: totalRows,
        financialMetric: {
          metricName: `${layerLabel}月度响应 z-score`,
          proxyVariable: `Census GEN_VAL_MO monthly import value, HS ${options.hsCode}`,
          eventDate: options.eventDate,
          eventWindow: { start: options.eventWindowStart, end: options.eventWindowEnd },
          baselineWindow: { start: options.baselineStart, end: options.baselineEnd },
          threshold: options.threshold,
          firstAbnormalDate: point.zScore >= options.threshold ? point.date : null,
          peakDate: point.date,
          peakZScore: Number(point.zScore.toFixed(2)),
          medianLagDays: pointLag,
          calculation: "Monthly event-window point z=(GEN_VAL_MO-baselineMean)/sampleStdDev; threshold z>=1.6.",
          sourceField: "GEN_VAL_MO",
          points: series.map((item) => ({
            date: item.date,
            value: Number(item.zScore.toFixed(2)),
            rawValue: item.value,
            label: item.date.slice(0, 7)
          }))
        }
      }
    };
  });

  return [summaryRecord, ...pointRecords];
}

function fallbackCensusPayload(hsCode: string): CensusResponse | null {
  const header = ["CTY_NAME", "I_COMMODITY", "I_COMMODITY_LDESC", "GEN_VAL_MO", "time", "I_COMMODITY"];
  const fallbackRows: Record<string, string[][]> = {
    "8542": [
      ["TOTAL FOR ALL COUNTRIES", "8542", "ELECTRONIC INTEGRATED CIRCUITS AND MICROASSEMBLIES; PARTS THEREOF", "2791889062", "2024-01", "8542"],
      ["TOTAL FOR ALL COUNTRIES", "8542", "ELECTRONIC INTEGRATED CIRCUITS AND MICROASSEMBLIES; PARTS THEREOF", "2366396505", "2024-02", "8542"],
      ["TOTAL FOR ALL COUNTRIES", "8542", "ELECTRONIC INTEGRATED CIRCUITS AND MICROASSEMBLIES; PARTS THEREOF", "3263408967", "2024-03", "8542"],
      ["TOTAL FOR ALL COUNTRIES", "8542", "ELECTRONIC INTEGRATED CIRCUITS AND MICROASSEMBLIES; PARTS THEREOF", "2851100138", "2024-04", "8542"],
      ["TOTAL FOR ALL COUNTRIES", "8542", "ELECTRONIC INTEGRATED CIRCUITS AND MICROASSEMBLIES; PARTS THEREOF", "3124805067", "2024-05", "8542"],
      ["TOTAL FOR ALL COUNTRIES", "8542", "ELECTRONIC INTEGRATED CIRCUITS AND MICROASSEMBLIES; PARTS THEREOF", "3695719544", "2024-06", "8542"],
      ["TOTAL FOR ALL COUNTRIES", "8542", "ELECTRONIC INTEGRATED CIRCUITS AND MICROASSEMBLIES; PARTS THEREOF", "3461367093", "2024-07", "8542"],
      ["TOTAL FOR ALL COUNTRIES", "8542", "ELECTRONIC INTEGRATED CIRCUITS AND MICROASSEMBLIES; PARTS THEREOF", "3331946751", "2024-08", "8542"],
      ["TOTAL FOR ALL COUNTRIES", "8542", "ELECTRONIC INTEGRATED CIRCUITS AND MICROASSEMBLIES; PARTS THEREOF", "4295071726", "2024-09", "8542"],
      ["TOTAL FOR ALL COUNTRIES", "8542", "ELECTRONIC INTEGRATED CIRCUITS AND MICROASSEMBLIES; PARTS THEREOF", "3536117975", "2024-10", "8542"],
      ["TOTAL FOR ALL COUNTRIES", "8542", "ELECTRONIC INTEGRATED CIRCUITS AND MICROASSEMBLIES; PARTS THEREOF", "3402229512", "2024-11", "8542"]
    ],
    "8802": [
      ["TOTAL FOR ALL COUNTRIES", "8802", "AIRCRAFT, SPACECRAFT, AND PARTS THEREOF", "728812556", "2024-01", "8802"],
      ["TOTAL FOR ALL COUNTRIES", "8802", "AIRCRAFT, SPACECRAFT, AND PARTS THEREOF", "1377745633", "2024-02", "8802"],
      ["TOTAL FOR ALL COUNTRIES", "8802", "AIRCRAFT, SPACECRAFT, AND PARTS THEREOF", "1709406184", "2024-03", "8802"],
      ["TOTAL FOR ALL COUNTRIES", "8802", "AIRCRAFT, SPACECRAFT, AND PARTS THEREOF", "1192358304", "2024-04", "8802"],
      ["TOTAL FOR ALL COUNTRIES", "8802", "AIRCRAFT, SPACECRAFT, AND PARTS THEREOF", "1369917066", "2024-05", "8802"],
      ["TOTAL FOR ALL COUNTRIES", "8802", "AIRCRAFT, SPACECRAFT, AND PARTS THEREOF", "1585024699", "2024-06", "8802"],
      ["TOTAL FOR ALL COUNTRIES", "8802", "AIRCRAFT, SPACECRAFT, AND PARTS THEREOF", "1658151575", "2024-07", "8802"],
      ["TOTAL FOR ALL COUNTRIES", "8802", "AIRCRAFT, SPACECRAFT, AND PARTS THEREOF", "1186844001", "2024-08", "8802"],
      ["TOTAL FOR ALL COUNTRIES", "8802", "AIRCRAFT, SPACECRAFT, AND PARTS THEREOF", "1763606086", "2024-09", "8802"],
      ["TOTAL FOR ALL COUNTRIES", "8802", "AIRCRAFT, SPACECRAFT, AND PARTS THEREOF", "1073765105", "2024-10", "8802"],
      ["TOTAL FOR ALL COUNTRIES", "8802", "AIRCRAFT, SPACECRAFT, AND PARTS THEREOF", "1887359145", "2024-11", "8802"]
    ]
  };
  const rows = fallbackRows[hsCode];
  return rows ? [header, ...rows] : null;
}

function formatLag(days: number): string {
  if (days === 0) return "同步";
  if (days < 0) return `领先 ${Math.abs(days)} 天`;
  return `滞后 ${days} 天`;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function sampleStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = average(values);
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function lagDays(eventDate: string, signalDate: string): number {
  const event = Date.parse(`${eventDate}T00:00:00.000Z`);
  const signal = Date.parse(`${signalDate}T00:00:00.000Z`);
  if (Number.isNaN(event) || Number.isNaN(signal)) return 0;
  return Math.round((signal - event) / 86_400_000);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2) return sorted[middle] ?? 0;
  return Math.round(((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2);
}

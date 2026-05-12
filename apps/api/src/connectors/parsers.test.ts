import { describe, expect, it } from "vitest";
import { parseBls } from "./bls";
import { parseCensus } from "./census";
import { parseGdelt } from "./gdelt";
import { parseNhtsa } from "./nhtsa";
import { parseOpenFda } from "./openfda";
import { parseReliefWeb } from "./reliefweb";
import { parseSecSubmission } from "./sec";
import { parseSpacexStarshipFlight5 } from "./spacex";
import { parseTechTradeWindow } from "./techTradeWindow";
import { parseUsgs } from "./usgs";

const fetchedAt = "2026-04-26T00:00:00.000Z";

describe("public source parsers", () => {

  it("parses SpaceX Starship center hotspot seed with source trace fields", () => {
    const records = parseSpacexStarshipFlight5(fetchedAt);
    const center = records.find((record) => record.tags.includes("center-hotspot"));
    expect(center?.title).toContain("SpaceX Starship Flight 5");
    expect(center?.sourceUrl).toContain("spacex.com");
    expect(records.length).toBeGreaterThan(1);
  });

  it("computes Census technology trade window z-score metrics", () => {
    const records = parseTechTradeWindow(
      [
        ["CTY_NAME", "I_COMMODITY", "I_COMMODITY_LDESC", "GEN_VAL_MO", "time", "I_COMMODITY"],
        ["TOTAL FOR ALL COUNTRIES", "8542", "Electronic integrated circuits", "100", "2024-01", "8542"],
        ["TOTAL FOR ALL COUNTRIES", "8542", "Electronic integrated circuits", "110", "2024-02", "8542"],
        ["TOTAL FOR ALL COUNTRIES", "8542", "Electronic integrated circuits", "120", "2024-03", "8542"],
        ["TOTAL FOR ALL COUNTRIES", "8542", "Electronic integrated circuits", "130", "2024-04", "8542"],
        ["TOTAL FOR ALL COUNTRIES", "8542", "Electronic integrated circuits", "140", "2024-05", "8542"],
        ["TOTAL FOR ALL COUNTRIES", "8542", "Electronic integrated circuits", "150", "2024-06", "8542"],
        ["TOTAL FOR ALL COUNTRIES", "8542", "Electronic integrated circuits", "160", "2024-07", "8542"],
        ["TOTAL FOR ALL COUNTRIES", "8542", "Electronic integrated circuits", "220", "2024-08", "8542"],
        ["TOTAL FOR ALL COUNTRIES", "8542", "Electronic integrated circuits", "260", "2024-09", "8542"]
      ],
      fetchedAt,
      {
        hsCode: "8542",
        layer: "core",
        eventDate: "2024-10-13",
        eventWindowStart: "2024-08-01",
        eventWindowEnd: "2024-11-30",
        baselineStart: "2024-01-01",
        baselineEnd: "2024-07-31",
        threshold: 1.6
      }
    );
    expect(records[0]?.rawFields.financialMetric).toBeTruthy();
    expect(records[0]?.quotedFields.some((field) => field.fieldPath === "computed.peakZScore")).toBe(true);
  });
  it("parses GDELT article responses into sourced records", () => {
    const records = parseGdelt(
      {
        articles: [
          {
            url: "https://example.com/news/supply-chain",
            title: "Supply chain disruption affects port operations",
            seendate: "20260426010000",
            domain: "example.com",
            sourcecountry: "US",
            language: "English"
          }
        ]
      },
      fetchedAt
    );

    expect(records[0]?.sourceUrl).toContain("https://");
    expect(records[0]?.quotedFields[0]?.fieldPath).toBe("articles[].title");
  });

  it("parses SEC submissions and preserves filing URLs", () => {
    const records = parseSecSubmission(
      {
        name: "Apple Inc.",
        cik: "0000320193",
        sicDescription: "Electronic Computers",
        tickers: ["AAPL"],
        filings: {
          recent: {
            accessionNumber: ["0000320193-26-000001"],
            filingDate: ["2026-01-30"],
            form: ["10-K"],
            primaryDocument: ["aapl-20260130.htm"]
          }
        }
      },
      fetchedAt
    );

    expect(records[0]?.sourceUrl).toContain("sec.gov/Archives");
    expect(records[0]?.primaryEntityName).toBe("Apple Inc.");
  });

  it("parses Census trade arrays into sourced records", () => {
    const records = parseCensus(
      [
        ["CTY_NAME", "I_COMMODITY", "I_COMMODITY_LDESC", "GEN_VAL_MO"],
        ["Taiwan", "8542", "Electronic integrated circuits", "123456789"]
      ],
      fetchedAt
    );

    expect(records[0]?.productOrCommodityName).toContain("Electronic");
    expect(records[0]?.sourceUrl).toContain("census.gov");
  });

  it("parses BLS series responses into computed signal source records", () => {
    const records = parseBls(
      {
        Results: {
          series: [
            {
              seriesID: "PCU336111336111",
              data: [
                { year: "2026", period: "M03", periodName: "March", value: "120.5" },
                { year: "2026", period: "M02", periodName: "February", value: "118.0" }
              ]
            }
          ]
        }
      },
      fetchedAt
    );

    expect(records[0]?.quotedFields.some((field) => field.fieldPath === "computed.delta")).toBe(true);
  });

  it("parses USGS GeoJSON features", () => {
    const records = parseUsgs(
      {
        features: [
          {
            id: "us1000",
            properties: {
              title: "M 6.5 - 10 km S of Test Place",
              place: "10 km S of Test Place",
              mag: 6.5,
              time: 1777132800000,
              updated: 1777136400000,
              url: "https://earthquake.usgs.gov/earthquakes/eventpage/us1000"
            }
          }
        ]
      },
      fetchedAt
    );

    expect(records[0]?.severityHint).toBe("high");
    expect(records[0]?.sourceUrl).toContain("usgs.gov");
  });

  it("parses openFDA enforcement reports", () => {
    const records = parseOpenFda(
      {
        results: [
          {
            recall_number: "D-0001-2026",
            recalling_firm: "Example Pharma LLC",
            product_description: "Example tablets",
            reason_for_recall: "CGMP deviations",
            classification: "Class II",
            report_date: "20260401",
            recall_initiation_date: "20260320",
            distribution_pattern: "Nationwide",
            status: "Ongoing"
          }
        ]
      },
      fetchedAt
    );

    expect(records[0]?.sourceUrl).toContain("api.fda.gov");
    expect(records[0]?.primaryEntityName).toBe("Example Pharma LLC");
  });

  it("parses NHTSA recall records", () => {
    const records = parseNhtsa(
      {
        results: [
          {
            NHTSACampaignNumber: "26V001000",
            Manufacturer: "Tesla, Inc.",
            Component: "ELECTRICAL SYSTEM",
            Summary: "A condition may affect vehicle operation.",
            Consequence: "Risk may increase.",
            ReportReceivedDate: "2026-04-01",
            ModelYear: "2024",
            Make: "TESLA",
            Model: "MODEL Y"
          }
        ]
      },
      fetchedAt
    );

    expect(records[0]?.sourceUrl).toContain("api.nhtsa.gov");
    expect(records[0]?.productOrCommodityName).toBe("ELECTRICAL SYSTEM");
  });

  it("parses ReliefWeb disaster records", () => {
    const records = parseReliefWeb(
      {
        data: [
          {
            id: "123",
            fields: {
              name: "Floods in Example Region",
              status: "current",
              type: [{ name: "Flood" }],
              country: [{ name: "Example Country" }],
              date: { created: "2026-04-01T00:00:00+00:00" },
              url: "https://reliefweb.int/disaster/123"
            }
          }
        ]
      },
      fetchedAt
    );

    expect(records[0]?.sourceUrl).toContain("reliefweb.int");
    expect(records[0]?.statusHint).toBe("expanding");
  });
});


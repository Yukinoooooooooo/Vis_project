import { describe, expect, it } from "vitest";
import type { ConnectorResult } from "../connectors/types";
import { parseOpenFda } from "../connectors/openfda";
import { parseSpacexStarshipFlight5 } from "../connectors/spacex";
import { buildSnapshot } from "./buildSnapshot";
import { getEventConstellationView } from "../services/viewService";

describe("snapshot authenticity guard", () => {

  it("prioritizes SpaceX financial hotspot as the default constellation center", () => {
    const records = [
      ...parseOpenFda(
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
        "2026-04-26T00:00:00.000Z"
      ),
      ...parseSpacexStarshipFlight5("2026-04-26T00:00:00.000Z")
    ];
    const snapshot = buildSnapshot([
      {
        descriptor: {
          sourceName: "mixed public sources",
          sourceType: "news",
          endpoint: "https://example.com",
          documentationUrl: "https://example.com",
          auth: "none",
          licenseNote: "Public data",
          lastFetchedAt: "2026-04-26T00:00:00.000Z",
          status: "ready"
        },
        records
      }
    ]);
    const view = getEventConstellationView(snapshot);
    expect(view.focusEventId).toContain("spacex_starship_flight5");
  });
  it("keeps source URLs on facts and derivation metadata on inferred edges", () => {
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
      "2026-04-26T00:00:00.000Z"
    );

    const result: ConnectorResult = {
      descriptor: {
        sourceName: "openFDA Drug Enforcement",
        sourceType: "recall",
        endpoint: "https://api.fda.gov/drug/enforcement.json",
        documentationUrl: "https://open.fda.gov/apis/drug/enforcement/",
        auth: "none",
        licenseNote: "Public FDA data",
        lastFetchedAt: "2026-04-26T00:00:00.000Z",
        status: "ready"
      },
      records
    };

    const snapshot = buildSnapshot([result]);

    expect(snapshot.events.every((event) => event.sourceUrl.startsWith("https://"))).toBe(true);
    expect(snapshot.evidenceCards.every((card) => card.sourcePreviewUrl.startsWith("https://"))).toBe(true);
    expect(snapshot.evidenceCards.every((card) => card.sourceTrace.sourceUrl.startsWith("https://"))).toBe(true);
    expect(snapshot.edges.every((edge) => edge.derivationType === "ruleDerived" && edge.ruleId.length > 0)).toBe(true);
    expect(snapshot.exposures.every((exposure) => exposure.factType === "directFact" && exposure.sourceUrl.startsWith("https://"))).toBe(true);
  });

  it("builds a global constellation with heat and lag metadata", () => {
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
          },
          {
            recall_number: "D-0002-2026",
            recalling_firm: "Example Pharma LLC",
            product_description: "Example capsules",
            reason_for_recall: "Labeling issue",
            classification: "Class III",
            report_date: "20260403",
            recall_initiation_date: "20260402",
            distribution_pattern: "Nationwide",
            status: "Ongoing"
          }
        ]
      },
      "2026-04-26T00:00:00.000Z"
    );
    const snapshot = buildSnapshot([
      {
        descriptor: {
          sourceName: "openFDA Drug Enforcement",
          sourceType: "recall",
          endpoint: "https://api.fda.gov/drug/enforcement.json",
          documentationUrl: "https://open.fda.gov/apis/drug/enforcement/",
          auth: "none",
          licenseNote: "Public FDA data",
          lastFetchedAt: "2026-04-26T00:00:00.000Z",
          status: "ready"
        },
        records
      }
    ]);

    const view = getEventConstellationView(snapshot, snapshot.events[0]?.eventId);
    expect(view.context.viewMode).toBe("constellation");
    expect(view.nodes.some((node) => node.kind === "focusEvent" && node.heatScore > 0)).toBe(true);
    expect(view.relations.every((relation) => relation.ruleId && relation.derivationType)).toBe(true);
    expect(view.summary.maxLagDays).toBeGreaterThanOrEqual(0);
  });
});

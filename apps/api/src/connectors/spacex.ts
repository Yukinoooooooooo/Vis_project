import { compactText, isoNow } from "./http";
import type { Connector, SourceRecord } from "./types";

const flight5SourceUrl = "https://www.spacex.com/launches/mission/?missionId=starship-flight-5";
const centerEventDate = "2024-10-13T00:00:00.000Z";

export const spacexConnector: Connector = {
  descriptor: {
    sourceName: "SpaceX Public Financial Event Timeline",
    sourceType: "news",
    endpoint: flight5SourceUrl,
    documentationUrl: flight5SourceUrl,
    auth: "none",
    licenseNote: "Public SpaceX, FAA, and financial reporting URLs; used only as sourced event facts with transparent source links."
  },
  async fetchRecords() {
    const fetchedAt = isoNow();
    return parseSpacexStarshipFlight5(fetchedAt);
  }
};

export function parseSpacexStarshipFlight5(fetchedAt: string): SourceRecord[] {
  const timeline: SourceRecord[] = [
    publicTimelineRecord({
      id: "spacex_faa_license_review_20240806",
      sourceUrl: "https://www.faa.gov/newsroom/statements/general-statements",
      rawRecordId: "faa-starship-flight-5-license-review-2024-08-06",
      title: "FAA review becomes a pre-event regulatory signal for Starship Flight 5",
      summary:
        "FAA public statements are used as a pre-event regulatory risk signal before Starship Flight 5; the system treats this as context for financing and industry-chain expectations, not as a market-price fact.",
      occurredAt: "2024-08-06T00:00:00.000Z",
      tags: ["spacex", "starship", "financial-hotspot", "regulatory-risk", "pre-event", "technology-chain", "aerospace"],
      severityHint: "medium",
      statusHint: "tracking",
      productOrCommodityName: "Starship launch license review",
      regionName: "United States",
      quotedFields: [
        { fieldPath: "source.kind", value: "FAA public statement index" },
        { fieldPath: "analysisRole", value: "pre-event regulatory signal for financial risk map" }
      ],
      rawFields: {
        analysisDesign: {
          role: "pre-event regulatory signal",
          eventDate: "2024-08-06",
          relatedCenterEvent: "2024-10-13 Starship Flight 5"
        }
      }
    }, fetchedAt),
    publicTimelineRecord({
      id: "spacex_faa_license_timing_20240912",
      sourceUrl: "https://www.faa.gov/newsroom/statements/general-statements",
      rawRecordId: "faa-starship-flight-5-license-timing-2024-09-12",
      title: "FAA license timing statement adds uncertainty before Starship Flight 5",
      summary:
        "The FAA timing statement is captured as an uncertainty event in the SpaceX financing and technology-chain window, because regulatory timing can affect expected launch cadence and supplier demand expectations.",
      occurredAt: "2024-09-12T00:00:00.000Z",
      tags: ["spacex", "starship", "financial-hotspot", "regulatory-risk", "pre-event", "technology-chain", "aerospace"],
      severityHint: "medium",
      statusHint: "tracking",
      productOrCommodityName: "Starship launch license timing",
      regionName: "United States",
      quotedFields: [
        { fieldPath: "source.kind", value: "FAA public statement index" },
        { fieldPath: "analysisRole", value: "regulatory uncertainty node before center hotspot" }
      ],
      rawFields: {
        analysisDesign: {
          role: "regulatory uncertainty node",
          eventDate: "2024-09-12",
          relatedCenterEvent: "2024-10-13 Starship Flight 5"
        }
      }
    }, fetchedAt),
    publicTimelineRecord({
      id: "spacex_starship_flight5_20241013",
      sourceUrl: flight5SourceUrl,
      rawRecordId: "starship-flight-5-2024-10-13",
      title: "SpaceX Starship Flight 5 booster catch and flight test",
      summary:
        "SpaceX Starship Flight 5 is used as the international hotspot T0 in the analysis window; the system treats it as a public event fact and tests related technology-chain proxy responses separately.",
      occurredAt: centerEventDate,
      tags: ["center-hotspot", "financial-hotspot", "spacex", "starship", "technology-chain", "space", "launch", "aerospace", "semiconductor"],
      severityHint: "high",
      statusHint: "tracking",
      productOrCommodityName: "Starship reusable launch system",
      regionName: "Starbase, Texas",
      quotedFields: [
        { fieldPath: "event.title", value: "SpaceX Starship Flight 5" },
        { fieldPath: "event.date", value: "2024-10-13" },
        { fieldPath: "analysisRole", value: "T0 international hotspot for technology-chain diffusion analysis" }
      ],
      rawFields: {
        analysisDesign: {
          eventDate: "2024-10-13",
          eventWindow: { start: "2024-08-01", end: "2024-11-30" },
          baselineWindow: { start: "2024-01-01", end: "2024-07-31" },
          threshold: 1.6,
          role: "center-hotspot"
        }
      }
    }, fetchedAt),
    publicTimelineRecord({
      id: "spacex_starship_flight6_20241119",
      sourceUrl: "https://www.spacex.com/launches/mission/?missionId=starship-flight-6",
      rawRecordId: "starship-flight-6-2024-11-19",
      title: "SpaceX Starship Flight 6 follow-up test extends the launch-cadence signal",
      summary:
        "Starship Flight 6 is captured as a follow-up cadence event after Flight 5, helping the star map show whether the operational signal continues after the center hotspot.",
      occurredAt: "2024-11-19T00:00:00.000Z",
      tags: ["spacex", "starship", "financial-hotspot", "post-event", "technology-chain", "space", "launch", "aerospace"],
      severityHint: "medium",
      statusHint: "expanding",
      productOrCommodityName: "Starship reusable launch system",
      regionName: "Starbase, Texas",
      quotedFields: [
        { fieldPath: "event.title", value: "SpaceX Starship Flight 6" },
        { fieldPath: "event.date", value: "2024-11-19" },
        { fieldPath: "analysisRole", value: "post-event launch-cadence signal" }
      ],
      rawFields: {
        analysisDesign: {
          role: "post-event cadence signal",
          eventDate: "2024-11-19",
          relatedCenterEvent: "2024-10-13 Starship Flight 5"
        }
      }
    }, fetchedAt),
    publicTimelineRecord({
      id: "spacex_valuation_secondary_sale_20241211",
      sourceUrl: "https://www.cnbc.com/2024/12/11/spacex-valuation-350-billion.html",
      rawRecordId: "cnbc-spacex-valuation-350b-2024-12-11",
      title: "SpaceX reported valuation reaches about $350B in secondary sale reporting",
      summary:
        "Public financial reporting about a SpaceX secondary-share sale is used as a later financing signal; it is shown as a sourced market-observation event, not as investment advice or a causal conclusion from Flight 5.",
      occurredAt: "2024-12-11T00:00:00.000Z",
      tags: ["spacex", "financial-hotspot", "valuation", "secondary-sale", "post-event", "market-observation", "technology-chain"],
      severityHint: "high",
      statusHint: "expanding",
      productOrCommodityName: "SpaceX secondary share sale / valuation reporting",
      regionName: "United States",
      quotedFields: [
        { fieldPath: "reported.valuation", value: "about USD 350 billion" },
        { fieldPath: "analysisRole", value: "post-event financing signal for risk map" }
      ],
      rawFields: {
        analysisDesign: {
          role: "post-event financing signal",
          eventDate: "2024-12-11",
          relatedCenterEvent: "2024-10-13 Starship Flight 5",
          boundary: "Public reporting only; no investment recommendation or causality claim."
        }
      }
    }, fetchedAt)
  ];

  return timeline;
}

type TimelineRecordInput = Omit<
  SourceRecord,
  "sourceName" | "sourceType" | "fetchedAt" | "licenseNote" | "updatedAt" | "primaryEntityName"
>;

function publicTimelineRecord(input: TimelineRecordInput, fetchedAt: string): SourceRecord {
  return {
    ...input,
    sourceName: spacexConnector.descriptor.sourceName,
    sourceType: spacexConnector.descriptor.sourceType,
    fetchedAt,
    licenseNote: spacexConnector.descriptor.licenseNote,
    updatedAt: fetchedAt,
    primaryEntityName: "SpaceX",
    summary: compactText(input.summary)
  };
}

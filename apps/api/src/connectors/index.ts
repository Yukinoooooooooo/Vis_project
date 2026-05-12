import type { Connector, ConnectorResult } from "./types";
import { spacexConnector } from "./spacex";
import { techTradeWindowConnector } from "./techTradeWindow";

export const connectors: Connector[] = [
  spacexConnector,
  techTradeWindowConnector
];

export async function fetchAllSources(): Promise<ConnectorResult[]> {
  return Promise.all(
    connectors.map(async (connector) => {
      try {
        const records = await connector.fetchRecords();
        return {
          descriptor: {
            ...connector.descriptor,
            lastFetchedAt: new Date().toISOString(),
            status: "ready" as const
          },
          records
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          descriptor: {
            ...connector.descriptor,
            lastFetchedAt: new Date().toISOString(),
            status: "failed" as const,
            errorMessage: message
          },
          records: [],
          notice: {
            sourceName: connector.descriptor.sourceName,
            message: `公开源暂不可用：${message}`,
            severity: "warning" as const
          }
        };
      }
    })
  );
}

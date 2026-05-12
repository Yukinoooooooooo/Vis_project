import { refreshSnapshot } from "../data/refresh";

const snapshot = await refreshSnapshot();
const ready = snapshot.sources.filter((source) => source.status === "ready").length;
const failed = snapshot.sources.filter((source) => source.status === "failed").length;

console.log(
  JSON.stringify(
    {
      generatedAt: snapshot.generatedAt,
      readySources: ready,
      failedSources: failed,
      events: snapshot.events.length,
      evidenceCards: snapshot.evidenceCards.length,
      cache: "apps/api/data/cache/latest-snapshot.json"
    },
    null,
    2
  )
);


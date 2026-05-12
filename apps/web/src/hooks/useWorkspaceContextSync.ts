import type { ViewContext } from "@risk-map/shared";
import { useEffect } from "react";
import { useWorkspaceStore } from "../stores/workspace";

export function useWorkspaceContextSync(context: ViewContext, nodeId?: string | null) {
  const setContext = useWorkspaceStore((state) => state.setContext);
  useEffect(() => {
    setContext({
      currentEventId: context.eventId,
      currentEventName: context.eventName,
      currentWindowId: context.windowId,
      currentWindowLabel: context.windowLabel,
      currentNodeId: nodeId ?? null
    });
  }, [context.eventId, context.eventName, context.windowId, context.windowLabel, nodeId, setContext]);
}


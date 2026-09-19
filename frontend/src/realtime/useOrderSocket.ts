import { useEffect, useRef } from "react";
import type { WsEvent } from "@table-order/shared";
import { getToken } from "../api/client";

// Unset in dev — falls back to the same-host /ws path that Vite's proxy
// forwards to the local `ws` server. In production this is the API Gateway
// WebSocket stage URL (e.g. wss://xxx.execute-api.../prod) baked in at
// build time — that API has no /ws path of its own, the stage URL itself
// is the connect endpoint.
const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL as string | undefined;

interface Options {
  sessionToken?: string;
  onEvent: (event: WsEvent) => void;
}

export function useOrderSocket({ sessionToken, onEvent }: Options) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    const token = getToken();
    if (!token && !sessionToken) return;

    const params = new URLSearchParams();
    if (token) params.set("token", token);
    if (sessionToken) params.set("sessionToken", sessionToken);

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const base = WS_BASE_URL ?? `${protocol}://${window.location.host}/ws`;
    const socket = new WebSocket(`${base}?${params.toString()}`);

    socket.onmessage = (event) => {
      try {
        onEventRef.current(JSON.parse(event.data));
      } catch {
        // ignore malformed frames
      }
    };

    return () => socket.close();
  }, [sessionToken]);
}

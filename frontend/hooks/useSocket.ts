import { useEffect, useRef } from "react";

type SocketData = {
  type?: string;
  message?: string;
  severity?: string;
  risk_score?: number;
  processed?: number;
  total?: number;
};

export default function useSocket(onMessage: (data: SocketData) => void) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;

    const connect = () => {
      // ✅ prevent multiple connections
      if (wsRef.current) return;

      const ws = new WebSocket("ws://localhost:8000/ws/alerts");
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("✅ WS Connected");
      };

      ws.onmessage = (event) => {
        const data: SocketData = JSON.parse(event.data);

        onMessage(data);

        if (data.type === "PROGRESS_UPDATE") {
          window.dispatchEvent(
            new CustomEvent("log-progress", {
              detail: {
                processed: data.processed || 0,
                total: data.total || 0,
              },
            })
          );
        }
      };

      ws.onclose = () => {
        console.log("❌ WS Disconnected. Reconnecting...");
        wsRef.current = null;
        reconnectTimeout = setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.log("WS Error:", err);
        ws.close();
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [onMessage]);
}
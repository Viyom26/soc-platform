"use client";

import { useEffect, useState } from "react";

type Attack = {
  ip?: string;
  severity?: string;
  message?: string;
  source_ip?: string;
};

export default function LiveAttacks() {

  const [attacks, setAttacks] = useState<Attack[]>([]);

  useEffect(() => {

    let ws: WebSocket | null = null;
    let reconnectTimer: NodeJS.Timeout;

    function connect() {

      const base =
        process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

      const wsUrl = base.replace("http", "ws") + "/ws/attack-stream";

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("Connected to attack stream");
      };

      ws.onmessage = (event) => {

        try {

          const data = JSON.parse(event.data);

          // ignore heartbeat
          if (data?.type === "heartbeat") return;

          setAttacks((prev) => [
            data,
            ...prev.slice(0, 50)
          ]);

        } catch (err) {

          console.error("Invalid WS data", err);

        }

      };

      ws.onerror = () => {

        console.warn("WebSocket error (backend may be restarting)");

      };

      ws.onclose = () => {

        console.warn("WebSocket closed, reconnecting...");

        reconnectTimer = setTimeout(connect, 3000);

      };

    }

    connect();

    return () => {

      if (reconnectTimer) clearTimeout(reconnectTimer);

      if (ws) ws.close();

    };

  }, []);

  return (

    <div className="p-6 text-white max-w-[1200px] mx-auto">

      <h1 className="text-2xl mb-6">
        SOC Live Attack Stream
      </h1>

      {attacks.length === 0 && (
        <p>No attacks yet...</p>
      )}

      {attacks.map((a, i) => (

        <div
          key={i}
          className="bg-slate-800 p-3 mb-2 rounded border border-slate-700"
        >

          <strong>
            {a.source_ip || a.ip || "Unknown IP"}
          </strong>

          {" → "}

          {a.message || "Suspicious activity detected"}

          <div className="text-sm text-red-400">
            {a.severity || "LOW"}
          </div>

        </div>

      ))}

    </div>

  );
}
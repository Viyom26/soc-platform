"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import SeverityPie from "@/components/charts/SeverityPie";
import { apiFetch } from "@/lib/api";

type Summary = {
  critical: number;
  high: number;
  medium: number;
  low: number;
};

type ThreatLevel = {
  level: string;
};

type LiveAlert = {
  source_ip?: string;
  severity?: string;
  risk_score?: number;
  type?: string;
};

type KPIProps = {
  label: string;
  value: number;
  color: string;
};

export default function CommandCenter() {

  const [summary, setSummary] = useState<Summary>({
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  });

  const [threatLevel, setThreatLevel] = useState<ThreatLevel | null>(null);
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);

  /* ================= LOAD SUMMARY ================= */

  const loadSummary = useCallback(async () => {
    try {

      const data = await apiFetch("/api/soc/summary");

      setSummary({
        critical: data?.critical_alerts ?? 0,
        high: data?.high_alerts ?? 0,
        medium: data?.medium_alerts ?? 0,
        low: data?.low_alerts ?? 0,
      });

      setLastUpdate(
        new Date().toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
        })
      );

    } catch {
      // silent fail
    }
  }, []);

  /* ================= LOAD THREAT LEVEL ================= */

  const loadThreatLevel = useCallback(async () => {
    try {

      const data = await apiFetch("/api/soc/threat-level");
      setThreatLevel(data);

    } catch {
      // silent fail
    }
  }, []);

  /* ================= INITIAL LOAD ================= */

  useEffect(() => {

    let mounted = true;

    async function init() {
      try {
        await Promise.all([
          loadSummary(),
          loadThreatLevel()
        ]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    const interval = setInterval(() => {
      loadSummary();
      loadThreatLevel();
    }, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };

  }, [loadSummary, loadThreatLevel]);

  /* ================= LIVE ALERT SOCKET ================= */

  useEffect(() => {

    function connect() {

      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        return;
      }

      try {

        const base =
          process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

        const socket = new WebSocket(
          base.replace("http", "ws") + "/ws/alerts"
        );

        socketRef.current = socket;

        socket.onopen = () => {};

        socket.onmessage = (event) => {

          try {

            const data: LiveAlert = JSON.parse(event.data);

            if (data?.type === "heartbeat") return;

            setLiveAlerts((prev) => {
              const exists = prev.find((a) =>
                a.source_ip === data.source_ip &&
                a.risk_score === data.risk_score
              );

              if (exists) return prev;

              return [data, ...prev.slice(0, 20)];
            });

            if (data?.severity === "CRITICAL" && audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(() => {});
            }

          } catch {
            // ignore invalid socket message
          }

        };

        socket.onerror = () => {};

        socket.onclose = () => {

          socketRef.current = null;

          reconnectTimer.current = setTimeout(() => {
            connect();
          }, 4000);

        };

      } catch {
        // silent fail
      }
    }

    connect();

    return () => {

      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
      }

      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

    };

  }, []);

  /* ================= LOADING UI ================= */

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] text-white p-10">
        Loading Command Center...
      </div>
    );
  }

  const severityData = [
    { severity: "CRITICAL", count: summary.critical },
    { severity: "HIGH", count: summary.high },
    { severity: "MEDIUM", count: summary.medium },
    { severity: "LOW", count: summary.low },
  ];

  const hasData =
    summary.critical +
    summary.high +
    summary.medium +
    summary.low > 0;

  return (
    <div className="min-h-screen text-white p-8 bg-[#020617] max-w-[1400px] mx-auto">

      <h1 className="text-4xl font-bold mb-4">
        SOC Command Center
      </h1>

      <div className="text-sm text-gray-400 mb-6 flex items-center gap-2">
        <span className="text-green-400">● LIVE</span>
        <span>Last update: {lastUpdate}</span>
      </div>

      {threatLevel && (
        <div className="mb-8 p-4 rounded-xl text-center font-bold bg-slate-800">
          GLOBAL THREAT LEVEL: {threatLevel.level}
        </div>
      )}

      <div className="bg-slate-900 p-6 rounded-xl mb-10">

        <h2 className="text-lg mb-6 text-gray-300">
          Severity Distribution
        </h2>

        {hasData ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <KPI label="CRITICAL" value={summary.critical} color="text-red-500" />
              <KPI label="HIGH" value={summary.high} color="text-orange-400" />
              <KPI label="MEDIUM" value={summary.medium} color="text-yellow-400" />
              <KPI label="LOW" value={summary.low} color="text-green-400" />
            </div>

            <SeverityPie data={severityData} />
          </>
        ) : (
          <div className="text-gray-500 text-sm">
            No alert data available.
          </div>
        )}

      </div>

      <div className="bg-slate-900 p-6 rounded-xl">

        <h2 className="mb-4 text-lg text-gray-300">
          Live Alerts Feed
        </h2>

        <div className="space-y-3 max-h-64 overflow-y-auto">

          {liveAlerts.length === 0 && (
            <div className="text-gray-500 text-sm">
              No live alerts yet.
            </div>
          )}

          {liveAlerts.map((alert, index) => (

            <div key={index} className="p-3 rounded-md bg-slate-800">

              <div className="text-sm">
                <div>Source: {alert.source_ip || "Unknown IP"}</div>
                <div className="font-semibold">Severity: {alert.severity || "LOW"}</div>
                <div>Risk: {alert.risk_score ?? 0}</div>
              </div>

            </div>

          ))}

        </div>

      </div>

      <audio ref={audioRef} src="/alert.mp3" />

    </div>
  );
}

/* ================= KPI CARD ================= */

function KPI({ label, value, color }: KPIProps) {

  return (
    <div className="bg-slate-800 p-4 rounded-xl text-center">
      <div className="text-gray-400 text-sm">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );

}
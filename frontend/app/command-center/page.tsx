"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import SeverityPie from "@/components/charts/SeverityPie";
import { useAlerts } from "@/context/AlertContext";
import { apiFetch } from "@/lib/api";
import toast, { Toaster } from "react-hot-toast";

type Summary = {
  critical: number;
  high: number;
  medium: number;
  low: number;
};

type ThreatLevel = {
  level: string;
};

type Incident = {
  id?: string;
  source_ip?: string;
  severity?: string;
  status?: string;
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
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);

  const { alerts } = useAlerts();

  /* ================= HELPER ================= */

  const extractIP = (text: string | undefined) => {
    if (!text) return null;
    const match = text.match(/\b\d{1,3}(\.\d{1,3}){3}\b/);
    return match ? match[0] : null;
  };

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
    } catch {}
  }, []);

  /* ================= LOAD THREAT LEVEL ================= */

  const loadThreatLevel = useCallback(async () => {
    try {
      const data = await apiFetch("/api/soc/threat-level");
      setThreatLevel(data);
    } catch {}
  }, []);

  /* ================= LOAD INCIDENTS ================= */

  const loadIncidents = useCallback(async () => {
    try {
      const data = await apiFetch("/incidents");

      if (Array.isArray(data)) {
        const openIncidents = data.filter(
          (item: Incident) => (item.status || "").toUpperCase() === "OPEN"
        );
        setIncidents(openIncidents.slice(0, 5));
      } else {
        setIncidents([]);
      }
    } catch {
      setIncidents([]);
    }
  }, []);

  /* ================= INITIAL LOAD ================= */

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await Promise.all([
          loadSummary(),
          loadThreatLevel(),
          loadIncidents(),
        ]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    const interval = setInterval(() => {
      loadSummary();
      loadThreatLevel();
      loadIncidents();
    }, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [loadSummary, loadThreatLevel, loadIncidents]);

  /* ================= QUICK ACTIONS ================= */

  const handleBlockIP = async () => {
    const ip = extractIP(alerts[0]?.message);

    if (!ip) return toast.error("No valid IP found");

    try {
      await apiFetch("/actions/block-ip", {
        method: "POST",
        body: JSON.stringify({ ip }),
      });

      toast.success(`Blocked IP: ${ip}`);
      loadIncidents();
    } catch {
      toast.error("Failed to block IP");
    }
  };

  const handleIsolateHost = async () => {
    const ip = extractIP(alerts[0]?.message);

    if (!ip) return toast.error("No valid host");

    try {
      await apiFetch("/actions/isolate-host", {
        method: "POST",
        body: JSON.stringify({ host: ip }),
      });

      toast.success(`Isolated: ${ip}`);
      loadIncidents();
    } catch {
      toast.error("Failed to isolate host");
    }
  };

  const handleCloseIncident = async () => {
    const incident = incidents[0];

    if (!incident?.id) return toast.error("No incident selected");

    try {
      await apiFetch(`/actions/incident/${incident.id}/close`, {
        method: "POST",
      });

      toast.success("Incident closed");
      loadIncidents();
    } catch {
      toast.error("Failed to close incident");
    }
  };

  /* ================= LOADING ================= */

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
    summary.critical + summary.high + summary.medium + summary.low > 0;

  const threatLevelColor =
    threatLevel?.level === "CRITICAL"
      ? "text-red-500 animate-pulse"
      : threatLevel?.level === "HIGH"
      ? "text-orange-400"
      : threatLevel?.level === "ELEVATED" || threatLevel?.level === "MEDIUM"
      ? "text-yellow-400"
      : "text-green-400";

  return (
    <div className="min-h-screen text-white p-8 bg-[#020617] max-w-[1400px] mx-auto">
      <Toaster position="top-right" />

      <h1 className="text-4xl font-bold mb-4">SOC Command Center</h1>

      <div className="text-sm text-gray-400 mb-6 flex items-center gap-2">
        <span className="text-green-400">● LIVE</span>
        <span>Last update: {lastUpdate}</span>
      </div>

      {threatLevel && (
        <div className="mb-8 p-4 rounded-xl text-center font-bold bg-slate-800 border border-slate-700">
          GLOBAL THREAT LEVEL:{" "}
          <span className={threatLevelColor}>{threatLevel.level}</span>
        </div>
      )}

      {/* 🔥 ALERTS */}
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
        <h2 className="mb-4 flex justify-between">
          🚨 Live Alerts
          <span>{alerts.length}</span>
        </h2>

        <div ref={feedRef} className="max-h-80 overflow-y-auto space-y-2">
          {alerts.length === 0 && (
            <div className="text-gray-500 text-sm">
              No live alerts yet.
            </div>
          )}

          {alerts.map((alert, index) => (
            <div key={index} className="p-3 bg-slate-800 rounded">
              {alert.message} - {alert.severity}
            </div>
          ))}
        </div>
      </div>

      {/* 🔥 QUICK ACTIONS */}
      <div className="mt-6 flex gap-4">
        <button onClick={handleBlockIP} className="px-4 py-2 bg-red-600 rounded">
          Block IP
        </button>

        <button
          onClick={handleIsolateHost}
          className="px-4 py-2 bg-yellow-500 text-black rounded"
        >
          Isolate Host
        </button>

        <button
          onClick={handleCloseIncident}
          className="px-4 py-2 bg-green-600 rounded"
        >
          Close Incident
        </button>
      </div>

      {/* 🔥 KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
        <KPI label="CRITICAL" value={summary.critical} color="text-red-500" />
        <KPI label="HIGH" value={summary.high} color="text-orange-400" />
        <KPI label="MEDIUM" value={summary.medium} color="text-yellow-400" />
        <KPI label="LOW" value={summary.low} color="text-green-400" />
      </div>

      {/* 🔥 CHART */}
      <div className="mt-10">
        {hasData ? (
          <SeverityPie data={severityData} />
        ) : (
          <div className="text-gray-500 text-sm">
            No alert data available.
          </div>
        )}
      </div>

      <audio ref={audioRef} src="/alert.mp3" />
    </div>
  );
}

/* KPI */

function KPI({ label, value, color }: KPIProps) {
  return (
    <div className="bg-slate-800 p-4 rounded-xl text-center border border-slate-700">
      <div className="text-gray-400 text-sm">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}
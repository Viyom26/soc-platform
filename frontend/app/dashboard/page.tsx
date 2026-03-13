"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { apiFetch } from "@/lib/api";
import HistoryPanel from "@/components/HistoryPanel";
import toast, { Toaster } from "react-hot-toast";
import Link from "next/link";
import "./dashboard.css";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

/* ================= TYPES ================= */

type LogItem = {
  src_ip: string;
  dst_ip?: string;
  severity: string;
  created_at?: string;
};

type Severity = {
  severity: string;
  count: number;
};

type Incident = {
  status: string;
};

type Attacker = {
  ip: string;
  attacks: number;
  avg_risk: number;
};

type Stats = {
  totalAlerts: number;
  criticalAlerts: number;
  openIncidents: number;
  uniqueIps: number;
};

/* ================= ANIMATED COUNTER ================= */

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 600;
    const increment = value / (duration / 16);

    const counter = setInterval(() => {
      start += increment;

      if (start >= value) {
        setDisplay(value);
        clearInterval(counter);
      } else {
        setDisplay(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(counter);
  }, [value]);

  return <h2>{display}</h2>;
}

/* ================= DASHBOARD ================= */

export default function DashboardPage() {

  const [stats, setStats] = useState<Stats>({
    totalAlerts: 0,
    criticalAlerts: 0,
    openIncidents: 0,
    uniqueIps: 0,
  });

  const [trendData, setTrendData] = useState<
    { hour: string; alerts: number }[]
  >([]);

  const [severityData, setSeverityData] = useState<Severity[]>([]);
  const [attackers, setAttackers] = useState<Attacker[]>([]);
  const [loading, setLoading] = useState(true);

  const wsRef = useRef<WebSocket | null>(null);

  /* ================= LIVE ATTACK STREAM ================= */

  const [liveAttacks, setLiveAttacks] = useState<LogItem[]>([]);

  useEffect(() => {

    async function loadStream() {

      try {

        const logs = await apiFetch("/logs");

        const items: LogItem[] = logs?.items || [];

        const sorted = [...items]
          .filter((l) => l.created_at)
          .sort(
            (a, b) =>
              new Date(b.created_at || "").getTime() -
              new Date(a.created_at || "").getTime()
          );

        setLiveAttacks(sorted.slice(0, 8));

      } catch (err) {
        console.error("Attack stream load error", err);
      }

    }

    loadStream();

    const interval = setInterval(loadStream, 5000);

    return () => clearInterval(interval);

  }, []);

  /* ================= LOAD DASHBOARD ================= */

  const loadDashboard = useCallback(async () => {

    try {

      const [logsData, incidents, severity, attackersData] = await Promise.all([
        apiFetch("/logs"),
        apiFetch("/incidents"),
        apiFetch("/api/soc/severity"),
        apiFetch("/api/threat-intel/attackers"),
      ]);

      const logs: LogItem[] = logsData?.items || [];

      setSeverityData(Array.isArray(severity) ? severity : []);

      const sortedAttackers: Attacker[] =
        (Array.isArray(attackersData) ? attackersData : [])
          .filter((a: Attacker) => a.ip)
          .sort((a: Attacker, b: Attacker) => b.attacks - a.attacks);

      setAttackers(sortedAttackers);

      setStats({
        totalAlerts: logs.length,

        criticalAlerts: logs.filter(
          (l: LogItem) => l.severity?.toUpperCase() === "CRITICAL"
        ).length,

        openIncidents:
          incidents?.filter((i: Incident) => i.status === "OPEN").length || 0,

        uniqueIps: new Set(logs.map((l: LogItem) => l.src_ip)).size,
      });

      const grouped: Record<string, number> = {};

      logs.forEach((log: LogItem) => {

        if (!log.created_at) return;

        const hour = new Date(log.created_at)
          .getHours()
          .toString()
          .padStart(2, "0");

        grouped[hour] = (grouped[hour] || 0) + 1;

      });

      const sortedTrend = Object.entries(grouped)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([hour, count]) => ({
          hour,
          alerts: count,
        }));

      setTrendData(sortedTrend);

    } catch (err) {

      console.error("Dashboard load error:", err);
      toast.error("Dashboard load failed");

    } finally {

      setLoading(false);

    }

  }, []);

  /* ================= INITIAL LOAD ================= */

  useEffect(() => {

    loadDashboard();

    const interval = setInterval(loadDashboard, 15000);

    return () => clearInterval(interval);

  }, [loadDashboard]);

  /* ================= WEBSOCKET ================= */

  useEffect(() => {

    if (wsRef.current) return;

    const ws = new WebSocket("ws://127.0.0.1:8000/ws/alerts");

    wsRef.current = ws;

    ws.onmessage = (event) => {

      try {

        const data = JSON.parse(event.data);

        if (data.severity === "CRITICAL") {
          toast.error("🚨 CRITICAL ALERT from " + (data.ip || "Unknown IP"));
        } else {
          toast("🔔 Alert from " + (data.ip || "Unknown IP"));
        }

        loadDashboard();

      } catch {}

    };

    return () => {

      ws.close();
      wsRef.current = null;

    };

  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="dashboard max-w-[1500px] mx-auto">
        <p className="muted">Loading Command Center...</p>
      </div>
    );
  }

  const severityColors: Record<string, string> = {
    CRITICAL: "#ef4444",
    HIGH: "#f97316",
    MEDIUM: "#f59e0b",
    LOW: "#22c55e",
    INFORMATIONAL: "#3b82f6",
  };

  return (

    <div className="dashboard">

      <Toaster position="top-right" />

      <h1>SOC Dashboard</h1>

      {/* ===== ALERT TICKER ===== */}

      <div className="alert-ticker">
        <div className="alert-ticker-track">
          {liveAttacks.map((log, i) => (
            <span key={i}>
              🚨 {log.src_ip} → {log.dst_ip || "Internal"} [{log.severity}]
            </span>
          ))}
        </div>
      </div>

      {/* ===== STATS ===== */}

      <div className="stats-row">

        <div className="stat-card">
          <span>Total Alerts</span>
          <AnimatedNumber value={stats.totalAlerts} />
        </div>

        <div className="stat-card critical">
          <span>Critical Alerts</span>
          <AnimatedNumber value={stats.criticalAlerts} />
        </div>

        <div className="stat-card warning">
          <span>Open Incidents</span>
          <AnimatedNumber value={stats.openIncidents} />
        </div>

        <div className="stat-card info">
          <span>Unique IPs</span>
          <AnimatedNumber value={stats.uniqueIps} />
        </div>

      </div>

      {/* ===== CHARTS ===== */}

      <div className="chart-grid">

        <div className="chart-card">

          <h3>Severity Distribution</h3>

          <ResponsiveContainer width="100%" height={300}>

            <PieChart>

              <Pie data={severityData} dataKey="count" nameKey="severity">

                {severityData.map((entry, index) => (

                  <Cell
                    key={index}
                    fill={severityColors[entry.severity] || "#3b82f6"}
                  />

                ))}

              </Pie>

              <Tooltip />

            </PieChart>

          </ResponsiveContainer>

        </div>

        <div className="chart-card">

          <h3>Alert Trend (Hourly)</h3>

          <ResponsiveContainer width="100%" height={300}>

            <LineChart data={trendData}>

              <CartesianGrid strokeDasharray="3 3" />

              <XAxis dataKey="hour" />

              <YAxis />

              <Tooltip />

              <Line
                type="monotone"
                dataKey="alerts"
                stroke="#2563eb"
                strokeWidth={3}
              />

            </LineChart>

          </ResponsiveContainer>

        </div>

      </div>

      {/* ===== TOP ATTACKERS ===== */}

      <div className="chart-card attackers-card">

        <h3>Top Attacking IPs</h3>

        <table className="attackers-table">

          <thead>
            <tr>
              <th>IP Address</th>
              <th>Attack Count</th>
              <th>Avg Risk</th>
              <th>Risk Level</th>
            </tr>
          </thead>

          <tbody>

            {attackers.slice(0, 5).map((a, i) => (

              <tr key={i}>

                <td className="ip">
                  <Link href={`/investigate?ip=${a.ip}`}>
                    {a.ip}
                  </Link>
                </td>

                <td>{a.attacks.toLocaleString()}</td>

                <td>{a.avg_risk}</td>

                <td>
                  <span className="risk-badge">
                    {a.avg_risk >= 70 ? "High" : a.avg_risk >= 40 ? "Medium" : "Low"}
                  </span>
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

      {/* ===== LIVE ATTACK STREAM ===== */}

      <div className="chart-card">

        <h3>⚡ Live Attack Stream</h3>

        {liveAttacks.map((log, i) => (

          <div
            key={i}
            className={`attack-stream-row ${
              log.severity === "CRITICAL" ? "attack-critical" : ""
            }`}
          >

            <span className="attack-icon">🚨</span>

            <Link href={`/investigate?ip=${log.src_ip}`} className="ip-link">
              {log.src_ip}
            </Link>

            <span className="attack-arrow">→</span>

            <span>{log.dst_ip || "Internal"}</span>

            <span
              className="risk-badge"
              style={{
                background: severityColors[log.severity] || "#475569",
              }}
            >
              {log.severity}
            </span>

            <span className="muted">
              {log.created_at
                ? new Date(log.created_at).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "--"}
            </span>

          </div>

        ))}

      </div>

      <HistoryPanel enableRiskFilter />

    </div>

  );

}
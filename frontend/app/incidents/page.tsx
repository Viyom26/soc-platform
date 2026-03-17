"use client";

import "./incidents.css";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import HistoryPanel from "@/components/HistoryPanel";
import Link from "next/link";

type Incident = {
  id: string;
  source_ip?: string;
  ip?: string;
  sourceIp?: string;
  severity?: string;
  status?: string;
  owner?: string;
  created_at?: string;
};

type Asset = {
  ip?: string;
  criticality?: string;
};

export default function IncidentsPage() {

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<Asset[]>([]);

  const [counts, setCounts] = useState({
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  });

  const [user, setUser] = useState<{ role?: string }>({});

  /* ================= LOAD USER ================= */

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem("user") || "{}");
        setUser(stored);
      } catch {
        setUser({});
      }
    }
  }, []);

  /* ================= LOAD DATA ================= */

  async function loadData() {

    try {

      const [incidentData, assetData] = await Promise.all([
        apiFetch("/incidents"),
        apiFetch("/api/assets")
      ]);

      const list: Incident[] = Array.isArray(incidentData) ? incidentData : [];

      setIncidents(list);
      setAssets(Array.isArray(assetData) ? assetData : []);

      const severityCounts = {
        CRITICAL: 0,
        HIGH: 0,
        MEDIUM: 0,
        LOW: 0,
      };

      list.forEach((i: Incident) => {
        const sev =
          (i.severity || "").toUpperCase() as keyof typeof severityCounts;

        if (severityCounts[sev] !== undefined) {
          severityCounts[sev]++;
        }
      });

      setCounts(severityCounts);

    } catch (err) {
      console.error("Failed to load incidents", err);
    } finally {
      setLoading(false);
    }

  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  /* ================= HELPERS ================= */

  function getAsset(ip: string) {
    return assets.find(a => a.ip === ip);
  }

  function rowClass(severity?: string) {
    const s = (severity || "").toUpperCase();

    if (s === "CRITICAL") return "row-critical";
    if (s === "HIGH") return "row-high";
    if (s === "MEDIUM") return "row-medium";
    if (s === "LOW") return "row-low";

    return "";
  }

  /* ================= STATUS COLORS ================= */

  const statusColor: Record<string, string> = {
    OPEN: "text-red-500",
    INVESTIGATING: "text-yellow-400",
    CONTAINED: "text-orange-400",
    RESOLVED: "text-green-400",
    CLOSED: "text-gray-400",
    BLOCKED: "text-red-700",
    ISOLATED: "text-purple-400",
  };

  /* ================= ACTIONS ================= */

  async function assignOwner(id?: string) {
    if (!id) return;

    try {
      await apiFetch(`/api/incidents/${id}/assign`, {
        method: "PATCH",
        body: JSON.stringify({
          owner: "SOC-Analyst",
        }),
      });

      alert("Incident assigned");
      loadData();

    } catch (err) {
      console.error("Assign failed", err);
    }
  }

  async function updateStatus(id?: string, status?: string) {
    if (!id) return;

    try {
      await apiFetch(`/api/incidents/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });

      loadData();

    } catch (err) {
      console.error("Status update failed", err);
    }
  }

  async function blockIP(ip: string) {
    try {
      await apiFetch("/actions/block-ip", {
        method: "POST",
        body: JSON.stringify({ ip }),
      });
      loadData();
    } catch (err) {
      console.error("Block failed", err);
    }
  }

  async function isolateHost(ip: string) {
    try {
      await apiFetch("/actions/isolate-host", {
        method: "POST",
        body: JSON.stringify({ host: ip }),
      });
      loadData();
    } catch (err) {
      console.error("Isolate failed", err);
    }
  }

  /* ================= ACCESS CONTROL ================= */

  if (user.role && user.role !== "Admin") {
    return <p style={{ padding: "20px" }}>Access denied</p>;
  }

  /* ================= UI ================= */

  return (

    <div className="incidents-page max-w-[1500px] mx-auto">

      <h1 className="page-title">Incidents</h1>

      <div className="incident-stats">

        <div className="stat critical">
          <span>CRITICAL</span>
          <h2>{counts.CRITICAL}</h2>
        </div>

        <div className="stat high">
          <span>HIGH</span>
          <h2>{counts.HIGH}</h2>
        </div>

        <div className="stat medium">
          <span>MEDIUM</span>
          <h2>{counts.MEDIUM}</h2>
        </div>

        <div className="stat low">
          <span>LOW</span>
          <h2>{counts.LOW}</h2>
        </div>

      </div>

      <div className="glass-card">

        {loading ? (
          <p className="muted">Loading incidents...</p>
        ) : incidents.length === 0 ? (
          <div className="soc-card">
            <p className="empty-text text-center">
              🚫 No incidents found
            </p>
          </div>
        ) : (

          <table className="incidents-table">

            <thead>
              <tr>
                <th>IP</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>

              {incidents.map((i, index) => {

                let ip =
                  i.source_ip ||
                  i.ip ||
                  i.sourceIp ||
                  "";

                try {
                  if (ip.startsWith("http")) {
                    ip = new URL(ip).hostname;
                  }
                } catch {}

                const asset = getAsset(ip);
                const isCritical = asset?.criticality === "CRITICAL";

                return (

                  <tr
                    key={i.id || index}
                    className={
                      isCritical
                        ? "bg-red-900/40"
                        : rowClass(i.severity)
                    }
                  >

                    <td>
                      {ip ? (
                        <>
                          <Link
                            href={`/incidents/${encodeURIComponent(ip)}`}
                            className="incident-ip-link"
                          >
                            {ip}
                          </Link>

                          {isCritical && (
                            <span className="ml-2 text-red-500 font-bold">
                              🚨 CRITICAL
                            </span>
                          )}
                        </>
                      ) : "-"}
                    </td>

                    <td className={`severity-${(i.severity || "info").toLowerCase()}`}>
                      {i.severity || "INFO"}
                    </td>

                    <td>
                      <select
                        value={i.status || "OPEN"}
                        onChange={(e) => updateStatus(i.id, e.target.value)}
                        className={`status-select ${statusColor[i.status || ""] || "text-gray-400"}`}
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="INVESTIGATING">INVESTIGATING</option>
                        <option value="CONTAINED">CONTAINED</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    </td>

                    <td>{i.owner || "-"}</td>

                    <td>
                      {i.created_at
                        ? new Date(i.created_at).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                          })
                        : "-"}
                    </td>

                    <td className="flex gap-2">

                      <button
                        className="assign-btn"
                        onClick={() => assignOwner(i.id)}
                      >
                        Assign
                      </button>

                      <button
                        className="bg-red-600 px-2 py-1 rounded text-white"
                        onClick={() => blockIP(ip)}
                      >
                        🚫
                      </button>

                      <button
                        className="bg-yellow-500 px-2 py-1 rounded text-black"
                        onClick={() => isolateHost(ip)}
                      >
                        🔌
                      </button>

                    </td>

                  </tr>

                );

              })}

            </tbody>

          </table>

        )}

      </div>

      <HistoryPanel pageFilter="incidents" />

    </div>

  );

}
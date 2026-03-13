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

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  const [counts, setCounts] = useState({
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  });

  const user =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "{}")
      : {};

  if (user.role && user.role !== "Admin") {
    return <p style={{ padding: "20px" }}>Access denied</p>;
  }

  useEffect(() => {
    async function loadData() {
      try {
        const data = await apiFetch("/incidents");

        const list: Incident[] = Array.isArray(data) ? data : [];

        setIncidents(list);

        const severityCounts = {
          CRITICAL: 0,
          HIGH: 0,
          MEDIUM: 0,
          LOW: 0,
        };

        list.forEach((i: Incident) => {
          const sev = (i.severity || "").toUpperCase() as keyof typeof severityCounts;

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

    loadData();

    const interval = setInterval(loadData, 15000);

    return () => clearInterval(interval);
  }, []);

  function rowClass(severity?: string) {
    const s = (severity || "").toUpperCase();

    if (s === "CRITICAL") return "row-critical";
    if (s === "HIGH") return "row-high";
    if (s === "MEDIUM") return "row-medium";
    if (s === "LOW") return "row-low";

    return "";
  }

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

      console.log("Status updated");
    } catch (err) {
      console.error("Status update failed", err);
    }
  }

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

                return (
                  <tr key={i.id || index} className={rowClass(i.severity)}>

                    {/* FIXED LINK */}
                    <td>
                      {ip ? (
                        <Link
                          href={`/incidents/${encodeURIComponent(ip)}`}
                          className="incident-ip-link"
                        >
                          {ip}
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td className={`severity-${(i.severity || "info").toLowerCase()}`}>
                      {i.severity || "INFO"}
                    </td>

                    <td>
                      <select
                        value={i.status || "OPEN"}
                        onChange={(e) => updateStatus(i.id, e.target.value)}
                        className="status-select"
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
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      })
    : "-"}
</td>

                    <td>
                      <button
                        className="assign-btn"
                        onClick={() => assignOwner(i.id)}
                      >
                        Assign Me
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
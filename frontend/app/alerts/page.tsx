"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import MitreBadge from "@/components/mitre/MitreBadge";
import toast from "react-hot-toast";

type Alert = {
  id: string;
  source_ip: string;
  severity: string;
  message: string;
  mitre_technique: string | null;
  created_at: string;
};

function getSeverityColor(severity: string) {
  switch (severity) {
    case "CRITICAL":
      return "#ff4d4f";
    case "HIGH":
      return "#ff7a45";
    case "MEDIUM":
      return "#faad14";
    case "LOW":
      return "#52c41a";
    default:
      return "#8c8c8c";
  }
}

export default function AlertsPage() {

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  /* NEW: Track newest alert for notification */
  const [lastAlertId, setLastAlertId] = useState<string | null>(null);

  async function loadAlerts() {

    try {

      const data = await apiFetch("/alerts/");

      if (Array.isArray(data)) {

        setAlerts(data);

        /* ================= DETECT NEW ALERT ================= */

        if (data.length > 0) {

          const newest = data[0];

          if (lastAlertId && newest.id !== lastAlertId) {

            toast(
              `🚨 ${newest.severity} Alert\nSource IP: ${newest.source_ip}`,
              {
                duration: 5000,
              }
            );

          }

          setLastAlertId(newest.id);

        }

      } else {
        setAlerts([]);
      }

    } catch (err) {

      console.error("Failed to load alerts", err);
      setAlerts([]);

    } finally {

      setLoading(false);

    }

  }

  useEffect(() => {

    loadAlerts();

    /* SOC REAL-TIME REFRESH */
    const interval = setInterval(loadAlerts, 10000); // 🔥 less load

    return () => clearInterval(interval);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: "24px" }}>

      <h1 style={{ fontSize: "28px", fontWeight: 600 }}>
        🚨 SOC Alerts
      </h1>

      {loading ? (
        <p style={{ marginTop: 20 }}>Loading alerts...</p>
      ) : alerts.length === 0 ? (
        <p style={{ marginTop: 20 }}>No alerts detected</p>
      ) : (

        <div
          style={{
            marginTop: 20,
            background: "#0f172a",
            borderRadius: 10,
            overflow: "hidden",
          }}
        >

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              color: "#e5e7eb",
            }}
          >

            <thead style={{ background: "#1e293b" }}>
              <tr>
                <th style={{ padding: 12, textAlign: "left" }}>Source IP</th>
                <th style={{ padding: 12 }}>Severity</th>
                <th style={{ padding: 12 }}>MITRE</th>
                <th style={{ padding: 12, textAlign: "left" }}>Message</th>
                <th style={{ padding: 12 }}>Time</th>
              </tr>
            </thead>

            <tbody>

              {alerts.map((alert) => (

                <tr
                  key={alert.id}
                  style={{
                    borderTop: "1px solid #334155",
                  }}
                >

                  <td style={{ padding: 12 }}>{alert.source_ip}</td>

                  <td style={{ padding: 12 }}>

                    <span
                      style={{
                        background: getSeverityColor(alert.severity),
                        padding: "4px 10px",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {alert.severity}
                    </span>

                  </td>

                  <td style={{ padding: 12 }}>
                    {alert.mitre_technique ? (
                      <MitreBadge technique={alert.mitre_technique} />
                    ) : (
                      "-"
                    )}
                  </td>

                  <td style={{ padding: 12 }}>{alert.message}</td>

                  <td style={{ padding: 12 }}>
                    {new Date(alert.created_at).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                    })}
                  </td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      )}

    </div>
  );
}
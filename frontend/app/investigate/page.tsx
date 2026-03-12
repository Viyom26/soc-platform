"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

type Event = {
  src_ip: string;
  dst_ip?: string;
  severity: string;
  mitre_technique?: string;
  created_at?: string;
};

export default function InvestigatePage() {

  const params = useSearchParams();
  const ip = params.get("ip");

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    async function load() {

      try {

        const logs = await apiFetch("/logs");

        const items: Event[] = logs?.items || [];

        const filtered = items.filter((e: Event) => e.src_ip === ip);

        /* ===== sort newest first ===== */

        const sorted = [...filtered].sort(
          (a, b) =>
            new Date(b.created_at || "").getTime() -
            new Date(a.created_at || "").getTime()
        );

        setEvents(sorted);

      } catch (err) {

        console.error("Investigation load error:", err);
        setEvents([]);

      } finally {

        setLoading(false);

      }

    }

    load();

  }, [ip]);

  return (

    <div style={{ padding: 30 }}>

      <h1 style={{ fontSize: "28px", fontWeight: 600 }}>
        SOC Incident Investigation
      </h1>

      <h3 style={{ marginTop: 10 }}>
        Attacker IP: <span style={{ color: "#ef4444" }}>{ip}</span>
      </h3>

      {loading ? (

        <p style={{ marginTop: 20 }}>Loading investigation data...</p>

      ) : events.length === 0 ? (

        <p style={{ marginTop: 20 }}>
          No activity found for this IP.
        </p>

      ) : (

        <table
          style={{
            width: "100%",
            marginTop: 20,
            borderCollapse: "collapse",
            background: "#0f172a",
            color: "#e5e7eb",
          }}
        >

          <thead style={{ background: "#1e293b" }}>
            <tr>
              <th style={{ padding: 12 }}>Time</th>
              <th style={{ padding: 12 }}>Target</th>
              <th style={{ padding: 12 }}>Severity</th>
              <th style={{ padding: 12 }}>MITRE</th>
            </tr>
          </thead>

          <tbody>

            {events.map((e, i) => (

              <tr
                key={i}
                style={{
                  borderTop: "1px solid #334155",
                }}
              >

                <td style={{ padding: 12 }}>
                  {e.created_at
                    ? new Date(e.created_at).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      })
                    : "-"}
                </td>

                <td style={{ padding: 12 }}>
                  {e.dst_ip || "Internal"}
                </td>

                <td style={{ padding: 12 }}>
                  {e.severity}
                </td>

                <td style={{ padding: 12 }}>
                  {e.mitre_technique || "-"}
                </td>

              </tr>

            ))}

          </tbody>

        </table>

      )}

    </div>

  );

}
"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import "./timeline.css";

type TimelineEvent = {
  ip?: string;
  event?: string;
  severity?: string;
  time?: string;
};

export default function AttackTimeline() {

  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {

    async function load() {

      try {

        const data = await apiFetch("/attack-timeline");

        setEvents(Array.isArray(data) ? data : []);

      } catch {

        setEvents([]);

      }

    }

    load();

  }, []);

  return (

    <div className="timeline-page max-w-[1200px] mx-auto space-y-4">

      <h1>Attack Timeline</h1>

      <div className="timeline">

        {events.map((e, i) => {

          /* Normalize severity */

          const rawSeverity = e?.severity ?? "LOW";

          const severityClass =
            rawSeverity.toLowerCase() as "low" | "medium" | "high" | "critical";

          const severityText =
            rawSeverity.toUpperCase();

          return (

            <div key={i} className="timeline-event">

              <div className={`severity ${severityClass}`}>
                {severityText}
              </div>

              <div className="event-info">

                <div>{e?.ip || "Unknown IP"}</div>

                <div>{e?.event || "Unknown event"}</div>

                <div>
                  {e?.time
                    ? new Date(e.time).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                      })
                    : "-"}
                </div>

              </div>

            </div>

          );

        })}

      </div>

    </div>

  );

}
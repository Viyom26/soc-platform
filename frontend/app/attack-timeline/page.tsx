"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import "./timeline.css";

export default function AttackTimeline() {

  const [events, setEvents] = useState<any[]>([]);

  useEffect(() => {

    async function load() {

      try {

        const data = await apiFetch("/attack-timeline");

        setEvents(Array.isArray(data) ? data : []);

      } catch (err) {

        console.error("Timeline load failed", err);
        setEvents([]);

      }

    }

    load();

  }, []);

  return (

    <div className="max-w-[1200px] mx-auto space-y-4">

      <h1>Attack Timeline</h1>

      <div className="timeline">

        {events.map((e: any, i) => {

          const severity =
            (e?.severity || "LOW").toLowerCase();

          return (

            <div key={i} className="timeline-event">

              <div className={`severity ${severity}`}>
                {e?.severity || "LOW"}
              </div>

              <div className="event-info">

                <div>{e?.ip || "Unknown IP"}</div>

                <div>{e?.event || "Unknown event"}</div>

                <div>
                  {e?.time
                    ? new Date(e.time).toLocaleString()
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
"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Attack = {
  source: string;
  target: string;
  risk: string;
  time: string;
};

type LogItem = {
  src_ip: string;
  dst_ip?: string;
  severity: string;
  created_at?: string;
};

export default function AttackStream() {

  const [attacks, setAttacks] = useState<Attack[]>([]);

  /* ================= DEMO ATTACK GENERATOR (FALLBACK) ================= */

  function generateAttack(): Attack {

    const countries = [
      "China",
      "Russia",
      "Iran",
      "USA",
      "Germany",
      "UK",
      "India",
      "Brazil"
    ];

    const riskLevels = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

    const source =
      countries[Math.floor(Math.random() * countries.length)];

    const target =
      countries[Math.floor(Math.random() * countries.length)];

    const risk =
      riskLevels[Math.floor(Math.random() * riskLevels.length)];

    return {
      source,
      target,
      risk,
      time: new Date().toLocaleTimeString(),
    };
  }

  /* ================= LOAD REAL ATTACK DATA ================= */

  async function loadRealAttacks() {

    try {

      const data = await apiFetch("/logs");

      const items: LogItem[] = data?.items || [];

      if (items.length === 0) return;

      const mapped: Attack[] = items
        .slice(0, 10)
        .map((log) => ({
          source: log.src_ip,
          target: log.dst_ip || "Internal",
          risk: log.severity,
          time: log.created_at
            ? new Date(log.created_at).toLocaleTimeString("en-IN", {
                timeZone: "Asia/Kolkata",
              })
            : new Date().toLocaleTimeString(),
        }));

      setAttacks(mapped);

    } catch (err) {

      console.warn("Attack stream API failed, using demo mode");

      setAttacks((prev) => {
        const newAttack = generateAttack();
        return [newAttack, ...prev].slice(0, 10);
      });

    }

  }

  /* ================= STREAM REFRESH ================= */

  useEffect(() => {

    loadRealAttacks();

    const interval = setInterval(() => {
      loadRealAttacks();
    }, 5000);

    return () => clearInterval(interval);

  }, []);

  return (
    <div className="bg-slate-900 p-4 rounded-lg mt-6">

      <h2 className="text-lg font-bold mb-3">
        ⚡ Live Attack Stream
      </h2>

      <div className="space-y-2 text-sm">

        {attacks.map((a, i) => (

          <div
            key={i}
            className={`bg-slate-800 p-2 rounded flex justify-between items-center attack-stream-row ${
              a.risk === "CRITICAL" ? "attack-critical" : ""
            }`}
          >

            <span>
              🚨 {a.source} → {a.target}
            </span>

            <span
              className={
                a.risk === "CRITICAL"
                  ? "text-red-500"
                  : a.risk === "HIGH"
                  ? "text-orange-400"
                  : a.risk === "MEDIUM"
                  ? "text-yellow-400"
                  : "text-green-400"
              }
            >
              {a.risk}
            </span>

            <span className="text-gray-400">
              {a.time}
            </span>

          </div>

        ))}

      </div>

    </div>
  );
}
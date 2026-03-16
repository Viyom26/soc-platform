"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Attacker = {
  ip: string;
  attacks: number;
  avg_risk: number;
};

export default function AttackersPage() {

  const [data, setData] = useState<Attacker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    async function load() {

      try {

        const json = await apiFetch("/api/threat-intel/attackers");

        setData(Array.isArray(json) ? json : []);

      } catch (err) {

        console.error("Failed to load attackers", err);
        setData([]);

      } finally {

        setLoading(false);

      }

    }

    load();

  }, []);

  return (
    <div className="p-6 text-white">

      <h1 className="text-2xl font-bold mb-4">
        All Attackers
      </h1>

      {loading && <p>Loading attackers...</p>}

      {!loading && data.length === 0 && (
        <p>No attackers found.</p>
      )}

      {data.map((item: Attacker, index) => (

        <div
          key={index}
          className="mb-3 bg-slate-800 p-3 rounded"
        >

          <div>IP: {item.ip}</div>
          <div>Attacks: {item.attacks}</div>
          <div>Avg Risk: {item.avg_risk}</div>

        </div>

      ))}

    </div>
  );
}
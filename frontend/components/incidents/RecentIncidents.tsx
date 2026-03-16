"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Incident = {
  id: string;
  source_ip?: string;
  severity?: string;
};

export default function RecentIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/incidents")
      .then((r) => r.json())
      .then((res) =>
        setIncidents(res.items || res.data || [])
      );
  }, []);

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-4">
      <h3 className="font-semibold mb-3">Recent Incidents</h3>

      {incidents.length === 0 && (
        <p className="text-zinc-400">No incidents found</p>
      )}

      <table className="w-full text-sm">
        <tbody>
          {incidents.map((i) => (
            <tr key={i.id} className="border-t border-zinc-800">
              <td className="py-2">{i.source_ip}</td>
              <td>
                <span
                  className={`px-2 py-1 rounded text-xs font-bold
                  ${
                    i.severity === "CRITICAL"
                      ? "bg-red-600 text-white"
                      : i.severity === "WARNING"
                      ? "bg-amber-500 text-black"
                      : "bg-green-600 text-white"
                  }`}
                >
                  {i.severity}
                </span>
              </td>
              <td className="text-right">
                <Link
                  href={`/incidents/${i.id}`}
                  className="text-blue-400 hover:underline"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
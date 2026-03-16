"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Incident = {
  id: string;
  source_ip: string;
  severity: string;
  status: string;
};

export default function RecentIncidents() {

  const [incidents, setIncidents] = useState<Incident[]>([]);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

  useEffect(() => {

    fetch("http://127.0.0.1:8000/incidents?limit=5", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data: Incident[]) => setIncidents(data));

  }, [token]);

  return (
    <div className="bg-zinc-900 p-4 rounded">
      <h3 className="font-bold mb-3">Recent Incidents</h3>

      <table className="w-full text-sm">
        <thead className="text-zinc-400">
          <tr>
            <th className="text-left">IP</th>
            <th className="text-left">Severity</th>
            <th className="text-left">Status</th>
          </tr>
        </thead>

        <tbody>
          {incidents.map((i) => (
            <tr key={i.id} className="border-t border-zinc-800">
              <td className="py-2">
                <Link
                  href={`/incidents/${i.source_ip}`}
                  className="text-blue-400 hover:underline"
                >
                  {i.source_ip}
                </Link>
              </td>
              <td className="font-bold text-red-400">
                {i.severity}
              </td>
              <td>{i.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
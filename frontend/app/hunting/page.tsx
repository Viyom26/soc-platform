"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

type HuntingResult = {
  source_ip?: string;
  severity?: string;
};

export default function HuntingPage() {

  const [ip, setIp] = useState("");
  const [results, setResults] = useState<HuntingResult[]>([]);

  const search = async () => {
    const data = await apiFetch(`/api/hunting?ip=${ip}`);
    setResults(Array.isArray(data) ? data : []);
  };

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl mb-4">Threat Hunting</h1>

      <input
        value={ip}
        onChange={(e) => setIp(e.target.value)}
        placeholder="Enter IP"
        className="p-2 text-black mr-2"
      />

      <button onClick={search} className="bg-blue-600 px-3 py-2">
        Search
      </button>

      <div className="mt-4">
        {results.map((r, i) => (
          <div key={i} className="border p-2 mb-2">
            {r.source_ip || "-"} - {r.severity || "-"}
          </div>
        ))}
      </div>
    </div>
  );
}
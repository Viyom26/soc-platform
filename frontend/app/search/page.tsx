"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";

export default function SearchPage() {

  const [ip, setIp] = useState("");
  const [results, setResults] = useState<any[]>([]);

  const search = async () => {
    const data = await apiFetch(`/api/search?ip=${ip}`);
    setResults(data || []);
  };

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl mb-4">Advanced Search</h1>

      <input
        value={ip}
        onChange={(e) => setIp(e.target.value)}
        placeholder="Search IP"
        className="p-2 text-black mr-2"
      />

      <button onClick={search} className="bg-green-600 px-3 py-2">
        Search
      </button>

      <div className="mt-4">
        {results.map((r, i) => (
          <div key={i} className="border p-2 mb-2">
            {r.source_ip} - {r.status}
          </div>
        ))}
      </div>
    </div>
  );
}
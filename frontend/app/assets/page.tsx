"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Asset = {
  id: string;
  ip: string;
  hostname: string;
  owner: string;
  criticality: string;
};

export default function AssetsPage() {

  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    const loadAssets = async () => {
      try {
        const data = await apiFetch("/api/assets");
        setAssets(Array.isArray(data) ? data : []);
      } catch {
        setAssets([]);
      }
    };

    loadAssets();
  }, []);

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl mb-4">Asset Management</h1>

      {assets.length === 0 ? (
        <p>No assets found</p>
      ) : (
        <table className="w-full border border-gray-700">
          <thead>
            <tr className="bg-slate-800">
              <th className="p-2">IP</th>
              <th className="p-2">Hostname</th>
              <th className="p-2">Owner</th>
              <th className="p-2">Criticality</th>
            </tr>
          </thead>

          <tbody>
            {assets.map((a) => (
              <tr key={a.id} className="border-t border-gray-700">
                <td className="p-2">{a.ip}</td>
                <td className="p-2">{a.hostname}</td>
                <td className="p-2">{a.owner}</td>
                <td className="p-2">{a.criticality}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
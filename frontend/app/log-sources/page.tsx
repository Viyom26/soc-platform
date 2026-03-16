"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type LogSource = {
  id: string;
  name: string;
  source_type: string;
  description?: string;
  enabled: boolean;
};

export default function LogSources() {

  const [sources, setSources] = useState<LogSource[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [desc, setDesc] = useState("");

  async function loadSources() {

    try {

      const data = await apiFetch("/log-sources");

      if (Array.isArray(data)) {
        setSources(data);
      } else {
        setSources([]);
      }

    } catch (err) {

      console.error("Load sources failed", err);
      setSources([]);

    }

  }

  useEffect(() => {

    async function init() {
      await loadSources();
    }

    init();

  }, []);

  async function addSource() {

    const cleanName = name.trim();
    const cleanType = type.trim();

    if (!cleanName || !cleanType) return;

    try {

      await apiFetch("/log-sources", {
        method: "POST",
        body: JSON.stringify({
          name: cleanName,
          source_type: cleanType,
          description: desc.trim()
        }),
      });

      setName("");
      setType("");
      setDesc("");

      loadSources();

    } catch (err) {

      console.error("Add source failed", err);

    }

  }

  async function toggle(id: string) {

    try {

      await apiFetch(`/log-sources/${id}/toggle`, {
        method: "PATCH"
      });

      loadSources();

    } catch (err) {

      console.error("Toggle source failed", err);

    }

  }

  return (
    <div className="p-6 text-white">

      <h1 className="text-2xl mb-6">Log Source Management</h1>

      <div className="bg-slate-800 p-4 rounded mb-6">

        <h2 className="mb-2">Add Log Source</h2>

        <input
          placeholder="Source Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="p-2 mr-2 text-black"
        />

        <input
          placeholder="Source Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="p-2 mr-2 text-black"
        />

        <input
          placeholder="Description"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="p-2 mr-2 text-black"
        />

        <button
          onClick={addSource}
          className="bg-blue-600 px-3 py-2 rounded"
        >
          Add
        </button>

      </div>

      {sources.length === 0 && (
        <p>No log sources configured.</p>
      )}

      {sources.map((s) => (

        <div key={s.id} className="bg-slate-800 p-4 mb-3 rounded">

          <div className="font-semibold">{s.name}</div>
          <div>Type: {s.source_type}</div>
          <div>Status: {s.enabled ? "Active" : "Disabled"}</div>

          <button
            onClick={() => toggle(s.id)}
            className="mt-2 bg-indigo-600 px-3 py-1 rounded"
          >
            Toggle
          </button>

        </div>

      ))}

    </div>
  );
}
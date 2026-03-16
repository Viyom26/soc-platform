"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { apiFetch } from "@/lib/api";

type AuditLog = {
  id: string;
  user: string;
  action: string;
  details?: string | null;
  created_at: string;
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [userFilter, setUserFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  /* ================= LOAD FUNCTION ================= */

  const load = useCallback(async () => {
    try {
      const data = await apiFetch("/api/audit/logs");

      if (!Array.isArray(data)) {
        throw new Error("Invalid response format");
      }

      const sorted = [...data].sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );

      setLogs(sorted);
      setError("");
    } catch (err: unknown) {

      console.error("Audit load failed:", err);

      setError("Failed to load audit logs.");

    } finally {
      setLoading(false);
    }
  }, []);

  /* ================= AUTO REFRESH ================= */

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  /* ================= FILTER LOGIC ================= */

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesUser =
        !userFilter ||
        log.user.toLowerCase().includes(userFilter.toLowerCase());

      const matchesAction =
        !actionFilter ||
        log.action.toLowerCase().includes(actionFilter.toLowerCase());

      const matchesSearch =
        !search ||
        log.user.toLowerCase().includes(search.toLowerCase()) ||
        log.action.toLowerCase().includes(search.toLowerCase()) ||
        (log.details || "").toLowerCase().includes(search.toLowerCase());

      const logDate = new Date(log.created_at);

      if (isNaN(logDate.getTime())) return false;

      const matchesFrom =
        !dateFrom || logDate >= new Date(dateFrom);

      const matchesTo =
        !dateTo ||
        logDate <= new Date(dateTo + "T23:59:59");

      return (
        matchesUser &&
        matchesAction &&
        matchesSearch &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [logs, userFilter, actionFilter, search, dateFrom, dateTo]);

  /* ================= TIME FORMAT ================= */

  const formatTime = (time: string) => {
    try {
      const date = new Date(time);

      if (isNaN(date.getTime())) return "Invalid time";

      return date.toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return "Invalid time";
    }
  };

  /* ================= UI ================= */

  return (
    <div className="p-6 min-h-screen bg-gradient-to-r from-slate-900 to-slate-800 text-white">
      <h1 className="text-2xl mb-6 font-semibold text-cyan-400">
        Audit Logs
      </h1>

      {/* ================= FILTER BAR ================= */}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">

        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="p-2 rounded bg-slate-700 text-white"
        />

        <input
          type="text"
          placeholder="Filter by User"
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          className="p-2 rounded bg-slate-700 text-white"
        />

        <input
          type="text"
          placeholder="Filter by Action"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="p-2 rounded bg-slate-700 text-white"
        />

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="p-2 rounded bg-slate-700 text-white"
        />

        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="p-2 rounded bg-slate-700 text-white"
        />

      </div>

      {/* ================= CONTENT ================= */}

      {loading && (
        <div className="text-gray-400 animate-pulse">
          Loading audit logs...
        </div>
      )}

      {error && (
        <div className="text-red-400 mb-4">{error}</div>
      )}

      {!loading && filteredLogs.length === 0 && (
        <div className="text-gray-400">
          No audit logs found.
        </div>
      )}

      {!loading &&
        filteredLogs.map((log) => (
          <div
            key={log.id}
            className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4 shadow-md hover:border-cyan-500 transition"
          >
            <div className="flex justify-between items-center">

              <div className="font-medium text-white">
                {log.user}
              </div>

              <div className="text-xs text-gray-400">
                {formatTime(log.created_at)}
              </div>

            </div>

            <div className="mt-2">
              <span className="px-3 py-1 text-sm font-semibold rounded bg-blue-600 text-white">
                {log.action}
              </span>
            </div>

            {log.details && (
              <div className="mt-2 text-sm text-gray-300">
                {log.details}
              </div>
            )}

          </div>
        ))}

    </div>
  );
}
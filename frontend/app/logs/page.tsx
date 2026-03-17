"use client";

import "./logs.css";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import Card from "@/components/ui/Card";
import HistoryPanel from "@/components/HistoryPanel";

type ParsedLog = {
  src_ip?: string;
  dst_ip?: string;
  src_port?: string;
  dst_port?: string;
  protocol?: string;
  threat?: string;
  event_time?: string;
  created_at?: string;
};

type LogsResponse =
  | ParsedLog[]
  | {
      items?: ParsedLog[];
    };

export default function LogsPage() {

  const [rawText, setRawText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [logs, setLogs] = useState<ParsedLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const safe = (val: unknown) =>
    val === null || val === undefined || val === "" ? "N/A" : String(val);

  /* ================= NORMAL FETCH ================= */

  const fetchLogs = async () => {

    try {

      const data: LogsResponse = await apiFetch("/logs");

      if (Array.isArray(data)) {
        setLogs(data);
        return data;
      }

      if (data && Array.isArray(data.items)) {
        setLogs(data.items);
        return data.items;
      }

      setLogs([]);
      return [];

    } catch (err) {

      console.error("Fetch logs error:", err);
      setLogs([]);
      return [];

    }

  };

  /* ================= SEARCH LOGS ================= */

  const searchLogs = async () => {

    try {

      const data = await apiFetch(
        `/logs/search?query=${searchQuery}&page=${page}`
      );

      if (Array.isArray(data)) {
        setLogs(data);
      } else if (!Array.isArray(data) && data?.items) {
        setLogs(data.items);
      } else {
        setLogs([]);
      }

    } catch (err) {
      console.error("Search error:", err);
      setLogs([]);
    }

  };

  /* ================= INITIAL LOAD ================= */

  useEffect(() => {
    fetchLogs();
  }, []);

  /* ================= PARSE LOGS ================= */

  const convertLogs = async (e?: React.MouseEvent<HTMLButtonElement>) => {

    if (e) e.preventDefault();

    if (loading) return;

    if (!rawText && !file) {
      setError("Please paste logs or upload a file.");
      return;
    }

    try {

      setLoading(true);
      setError("");
      setLogs([]);

      const formData = new FormData();

      if (rawText) {
        formData.append("raw_text", rawText);
      }

      if (file) {
        formData.append("file", file);
      }

      await apiFetch("/logs/parse", {
        method: "POST",
        body: formData,
      });

      setError("Logs uploaded. Processing may take a few seconds...");

      let attempts = 0;

      const checkLogs = async () => {

        attempts++;

        const newLogs = await fetchLogs();

        if (newLogs.length === 0 && attempts < 10) {
          setTimeout(checkLogs, 3000);
        }

      };

      setTimeout(checkLogs, 3000);

      setRawText("");
      setFile(null);
      setFileName("");

    } catch (e: unknown) {

      console.error("Parser error:", e);

      setError(
        "Log processing started in background. Please wait a few seconds..."
      );

    } finally {

      setLoading(false);

    }

  };

  return (
    <div className="logs-page max-w-[1500px] mx-auto">

      <h1 className="page-title">Log Parser</h1>

      <Card title="Input Logs">

        <textarea
          rows={6}
          placeholder="Paste raw log lines here..."
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          className="log-textarea"
        />

        <div className="file-upload-wrapper">

          <label className="file-upload-label">
            Choose File

            <input
              type="file"
              accept=".txt,.log,.csv,.xlsx"
              className="file-upload-input"
              disabled={loading}
              onChange={(e) => {

                const selected = e.target.files?.[0] || null;

                if (selected) {
                  setFile(selected);
                  setFileName(selected.name);
                } else {
                  setFile(null);
                  setFileName("");
                }

              }}
            />

          </label>

          <span className="file-name">
            {fileName ? fileName : "No file selected"}
          </span>

        </div>

        <button
          type="button"
          onClick={(e) => convertLogs(e)}
          disabled={loading}
          className="primary-btn"
        >
          {loading ? "Parsing logs..." : "Convert Logs"}
        </button>

        {error && <p className="error-text">{error}</p>}

      </Card>

      {/* 🔥 SEARCH BAR ADDED HERE */}

      <div style={{ margin: "20px 0" }}>
        <input
          type="text"
          placeholder="Search by IP or message..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") searchLogs();
          }}
          style={{ padding: "8px", width: "250px", marginRight: "10px" }}
        />

        <button onClick={searchLogs}>Search</button>
      </div>

      <Card title="Parsed Output">

        {!loading && logs.length === 0 && (

          <div className="mt-6 p-6 rounded-lg bg-slate-900 border border-slate-700 text-center">
            <p className="text-slate-400 text-sm tracking-wide">
              Upload logs to see results.
            </p>
          </div>

        )}

        {logs.length > 0 && (

          <div className="logs-table-wrapper">

            <table className="logs-table">

              <thead>
                <tr>
                  <th>Source IP</th>
                  <th>Destination IP</th>
                  <th>Source Port</th>
                  <th>Destination Port</th>
                  <th>Protocol</th>
                  <th>Threat</th>
                  <th>Event Time</th>
                </tr>
              </thead>

              <tbody>

                {logs.map((l, i) => {

                  const time = l.event_time || l.created_at;

                  return (
                    <tr key={i}>
                      <td>{safe(l.src_ip)}</td>
                      <td>{safe(l.dst_ip)}</td>
                      <td>{safe(l.src_port)}</td>
                      <td>{safe(l.dst_port)}</td>
                      <td>{safe(l.protocol)}</td>
                      <td>{safe(l.threat)}</td>
                      <td>
                        {time
                          ? new Date(time).toLocaleString("en-IN", {
                              timeZone: "Asia/Kolkata",
                              year: "numeric",
                              month: "short",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit"
                            })
                          : "N/A"}
                      </td>
                    </tr>
                  );

                })}

              </tbody>

            </table>

          </div>

        )}

      </Card>

      {/* 🔥 PAGINATION ADDED */}

      <div style={{ marginTop: "10px" }}>
        <button
          onClick={() => {
            const newPage = Math.max(1, page - 1);
            setPage(newPage);
            setTimeout(searchLogs, 0);
          }}
        >
          Prev
        </button>

        <span style={{ margin: "0 10px" }}>Page {page}</span>

        <button
          onClick={() => {
            const newPage = page + 1;
            setPage(newPage);
            setTimeout(searchLogs, 0);
          }}
        >
          Next
        </button>
      </div>

      <HistoryPanel pageFilter="logs" />

    </div>
  );
}
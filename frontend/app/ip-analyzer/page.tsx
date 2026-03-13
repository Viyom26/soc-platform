"use client";

import "./ip-analyzer.css";
import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import HistoryPanel from "@/components/HistoryPanel";

type IPResult = {
  ip: string;
  score: number;
  risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  reputation?: number;
  country?: string;
  city?: string;
  isp?: string;
  company?: string;
  asn?: string;
  tor_exit?: boolean;
  blacklisted?: boolean;
  anomaly_score?: number;
  virustotal?: {
    malicious?: number;
    suspicious?: number;
  };
};

export default function IPAnalyzerPage() {

  const [ipInput, setIpInput] = useState("");
  const [results, setResults] = useState<IPResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/auth/me").catch(() => {});
  }, []);

  function isPrivateIP(ip: string) {
    const parts = ip.split(".");
    if (parts.length !== 4) return false;

    const first = parseInt(parts[0]);
    const second = parseInt(parts[1]);

    return (
      first === 10 ||
      (first === 172 && second >= 16 && second <= 31) ||
      (first === 192 && second === 168)
    );
  }

  function displayCountry(ip: string, country?: string) {
    if (isPrivateIP(ip)) return "Internal Network";
    if (!country || country === "N/A") return "Unknown";
    return country;
  }

  function displayCity(ip: string, city?: string) {
    if (isPrivateIP(ip)) return "Internal";
    return city || "Unknown";
  }

  function displayISP(ip: string, isp?: string) {
    if (isPrivateIP(ip)) return "Private Network";
    return isp || "Unknown";
  }

  async function analyzeIp() {

    const ips = ipInput
      .split(/[\s,]+/)
      .map((ip) => ip.trim())
      .filter(Boolean);

    if (!ips.length) return;

    setLoading(true);
    setError("");
    setResults([]);

    try {

      const data = await apiFetch("/api/ip/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ips }),
      });

      setResults(Array.isArray(data) ? data : []);

    } catch {
      setError("Failed to analyze IP(s).");
    } finally {
      setLoading(false);
    }
  }

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => b.score - a.score);
  }, [results]);

  function riskClass(risk: string) {
    if (risk === "CRITICAL") return "badge badge-critical";
    if (risk === "HIGH") return "badge badge-high";
    if (risk === "MEDIUM") return "badge badge-medium";
    return "badge badge-low";
  }

  function riskBorder(risk: string) {
    if (risk === "CRITICAL") return "5px solid #ef4444";
    if (risk === "HIGH") return "5px solid #f97316";
    if (risk === "MEDIUM") return "5px solid #f59e0b";
    return "5px solid #22c55e";
  }

  return (

    <div className="ip-analyzer-page max-w-[1400px] mx-auto">

      <h1 className="page-title">🧠 IP Analyzer</h1>

      <div className="ip-card">

        <div className="ip-input-group">

          <textarea
            className="ip-input"
            placeholder="Enter one or multiple IPs (space or comma separated)"
            value={ipInput}
            onChange={(e) => setIpInput(e.target.value)}
            rows={3}
          />

          <button
            className="ip-btn"
            onClick={analyzeIp}
            disabled={loading}
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>

        </div>

        {error && <div className="error-text">{error}</div>}

        {sortedResults.map((result) => (

          <div
            key={result.ip}
            className="result-card"
            style={{ borderLeft: riskBorder(result.risk) }}
          >

            <div className="result-header">

              <h3>Threat Intelligence Report</h3>

              <div className="header-right">

                <span className={riskClass(result.risk)}>
                  {result.risk}
                </span>

                {result.blacklisted && (
                  <span className="blacklisted">
                    🚫 BLACKLISTED
                  </span>
                )}

              </div>

            </div>

            <div className="result-grid">

              <div>
                <strong>IP Address</strong>
                <span
                  className="clickable-ip"
                  onClick={() => setIpInput(result.ip)}
                >
                  {result.ip}
                </span>

                {result.tor_exit && (
                  <div className="tor-flag">
                    ⚠ Tor Exit Node
                  </div>
                )}
              </div>

              <div>
                <strong>Risk Score</strong>
                <span>{result.score}</span>
              </div>

              <div>
                <strong>Reputation</strong>
                <span>{result.reputation ?? 0}</span>
              </div>

              <div>
                <strong>AI Anomaly Score</strong>
                <span>{result.anomaly_score ?? 0}</span>
              </div>

              <div>
                <strong>Country</strong>
                <span>{displayCountry(result.ip, result.country)}</span>
              </div>

              <div>
                <strong>City</strong>
                <span>{displayCity(result.ip, result.city)}</span>
              </div>

              <div>
                <strong>ISP</strong>
                <span>{displayISP(result.ip, result.isp)}</span>
              </div>

              <div>
                <strong>ASN</strong>
                <span>{result.asn || "Unknown"}</span>
              </div>

              <div>
                <strong>VT Malicious</strong>
                <span>{result.virustotal?.malicious ?? 0}</span>
              </div>

              <div>
                <strong>VT Suspicious</strong>
                <span>{result.virustotal?.suspicious ?? 0}</span>
              </div>

            </div>

          </div>

        ))}

        <HistoryPanel pageFilter="ip-analyzer" enableRiskFilter />

      </div>

    </div>

  );

}
"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { apiFetch } from "@/lib/api";
import "./threat-intel.css";

type Threat = {
  source_ip: string;
  destination_ip?: string;
  country: string;
  attacks: number;
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidence: number;
};

export default function ThreatIntelPage() {
  const [data, setData] = useState<Threat[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  const sourceFilter = searchParams.get("source_ip");
  const destinationFilter = searchParams.get("destination_ip");

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        let url = "/api/threat-intel";

        const params = new URLSearchParams();

        if (sourceFilter) params.append("source_ip", sourceFilter);
        if (destinationFilter) params.append("destination_ip", destinationFilter);

        if (params.toString()) {
          url += `?${params.toString()}`;
        }

        const json = await apiFetch(url);

if (Array.isArray(json)) {
  setData(json);
} else if (Array.isArray(json?.items)) {
  setData(json.items);
} else {
  setData([]);
}
      } catch (err) {
        console.error("Threat Intel load failed", err);
        setData([]);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [sourceFilter, destinationFilter]);

  /* ================= FILTERING ================= */

  const filtered = useMemo(() => {
    return data
      .filter((item) => {
        if (!search) return true;

        const s = search.toLowerCase();

        return (
          item.source_ip?.toLowerCase()?.includes(s) ||
          item.destination_ip?.toLowerCase()?.includes(s)
        );
      })
      .sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0));
  }, [data, search]);

  function riskColor(level: string) {
    switch (level) {
      case "CRITICAL":
        return "badge critical";
      case "HIGH":
        return "badge high";
      case "MEDIUM":
        return "badge medium";
      default:
        return "badge low";
    }
  }

  function displayCountry(country: string) {
    if (!country) return "Unknown";
    if (country === "Private Network") return "Internal Network";
    return country;
  }

  return (
    <div className="threat-container max-w-[1500px] mx-auto">
      <div className="threat-header">
        <h1>Threat Intelligence Center</h1>

        <input
          type="text"
          placeholder="Search by IP..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-box"
        />

        {(sourceFilter || destinationFilter) && (
          <button
            onClick={() => router.push("/threat-intel")}
            className="expand-btn"
          >
            Clear Filter
          </button>
        )}
      </div>

      {loading ? (
        <p className="loading">Loading intelligence...</p>
      ) : filtered.length === 0 ? (
        <p className="loading">No threat intelligence data found.</p>
      ) : (
        <div className="threat-table">
          <div className="threat-row header">
            <span>Attack Flow</span>
            <span>Country</span>
            <span>Attacks</span>
            <span>Risk Score</span>
            <span>Risk Level</span>
            <span>Confidence</span>
          </div>

          {filtered.map((t) => {
            const key = `${t.source_ip}-${t.destination_ip || "SOC-Core"}`;

            return (
              <div key={key}>
                <div
                  className="threat-row"
                  onClick={() =>
                    setExpanded(expanded === key ? null : key)
                  }
                >
                  <span className="attack-flow">
                    <span className="src">{t.source_ip}</span>
                    <span className="arrow"> ➜ </span>
                    <span className="dst">
                      {t.destination_ip || "SOC-Core"}
                    </span>
                  </span>

                  <span>{displayCountry(t.country)}</span>
                  <span>{t.attacks}</span>

                  <span>
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${t.risk_score || 0}%` }}
                      />
                    </div>
                    {t.risk_score}
                  </span>

                  <span>
                    <span className={riskColor(t.risk_level)}>
                      {t.risk_level}
                    </span>
                  </span>

                  <span>
                    <div className="confidence-bar">
                      <div style={{ width: `${t.confidence || 0}%` }} />
                    </div>
                    {t.confidence}%
                  </span>
                </div>

                {expanded === key && (
                  <div className="expanded-row">
                    <p>
                      <strong>Attack Count:</strong> {t.attacks}
                    </p>

                    <button
  onClick={() => {
    if (t.source_ip) {
      router.push(`/threat-intel?source_ip=${t.source_ip}`);
    }
  }}
  className="expand-btn"
>
  View All Destinations
</button>

                    <button
  onClick={() => {
    if (t.destination_ip) {
      router.push(`/threat-intel?destination_ip=${t.destination_ip}`);
    }
  }}
  className="expand-btn"
>
  View All Attackers
</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
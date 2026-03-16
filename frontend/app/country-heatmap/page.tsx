"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
} from "react-simple-maps";
import worldData from "world-atlas/countries-110m.json";
import { apiFetch } from "@/lib/api";
import "./country-heatmap.css";

type CountryData = {
  country: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
};

export default function CountryHeatmapPage() {

  const [data, setData] = useState<CountryData[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] =
    useState<CountryData | null>(null);

  /* ================= LOAD DATA ================= */

  const loadData = async (): Promise<void> => {

    try {

      const json = await apiFetch("/api/geo/country-summary");

      if (Array.isArray(json)) {
        setData(json as CountryData[]);
      } else {
        setData([]);
      }

    } catch {
      setData([]);
    }

  };

  /* ================= REAL-TIME REFRESH ================= */

  useEffect(() => {

    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();

    const interval = setInterval(loadData, 5000);

    return () => clearInterval(interval);

  }, []);

  /* ================= COUNTRY LOOKUP ================= */

  const countryMap = useMemo(() => {

    const map: Record<string, CountryData> = {};

    data.forEach((c) => {
      if (c.country) {
        map[c.country.toLowerCase()] = c;
      }
    });

    return map;

  }, [data]);

  function getCountry(name: string) {
    return countryMap[name.toLowerCase()];
  }

  /* ================= RISK SCORING ================= */

  function getRiskScore(country: CountryData) {

    return (
      country.critical * 5 +
      country.high * 3 +
      country.medium * 2 +
      country.low
    );

  }

  function getColor(name: string) {

    const country = getCountry(name);

    if (!country) return "#0f172a";

    const score = getRiskScore(country);

    if (score > 150) return "#ff0000";
    if (score > 80) return "#ff3b3b";
    if (score > 40) return "#ff6b6b";
    if (score > 20) return "#7f1d1d";
    if (score > 0) return "#451a1a";

    return "#0f172a";

  }

  /* ================= RANKING ================= */

  const rankedCountries = useMemo(() => {

    return [...data]
      .sort((a, b) => getRiskScore(b) - getRiskScore(a))
      .slice(0, 5);

  }, [data]);

  return (
    <div className="heatmap-wrapper">

      <div className="stars" />

      <div className="heatmap-main">

        <h1 className="heatmap-title">
          🌍 Global Threat Heatmap
        </h1>

        <ComposableMap projectionConfig={{ scale: 160 }}>
          <Geographies geography={worldData}>
            {({ geographies }) =>
              geographies.map((geo) => {

                const country = getCountry(geo.properties.name);
                const score = country ? getRiskScore(country) : 0;
                const isCritical = country?.critical > 0;

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getColor(geo.properties.name)}
                    stroke="#020617"
                    onMouseEnter={() =>
                      setHovered(
                        country
                          ? `${country.country} — ${country.total} attacks`
                          : "No data"
                      )
                    }
                    onMouseLeave={() => setHovered(null)}
                    onClick={() =>
                      setSelectedCountry(country || null)
                    }
                    style={{
                      default: {
                        outline: "none",
                        filter:
                          score > 40
                            ? "drop-shadow(0 0 6px rgba(255,0,0,0.6))"
                            : "none",
                        animation: isCritical
                          ? "blinkCritical 1.5s infinite"
                          : "none",
                        transition: "all 0.3s ease",
                      },
                      hover: {
                        fill: getColor(geo.properties.name),
                        outline: "none",
                      },
                      pressed: { outline: "none" },
                    }}
                  />
                );

              })
            }
          </Geographies>
        </ComposableMap>

        {hovered && (
          <div className="heatmap-tooltip">
            {hovered}
          </div>
        )}

      </div>

      <div className="heatmap-side">

        <h3>Top Threat Countries</h3>

        {rankedCountries.map((c, i) => (
          <div key={i} className="rank-card">
            <strong>{c.country}</strong>
            <span>{c.total} attacks</span>
          </div>
        ))}

        <div className="heatmap-legend">
          <div className="legend-bar" />
          <div className="legend-labels">
            <span>Low</span>
            <span>Critical</span>
          </div>
        </div>

      </div>

      {selectedCountry && (
        <div className="heatmap-drawer">

          <button onClick={() => setSelectedCountry(null)}>
            Close
          </button>

          <h2>{selectedCountry.country}</h2>

          <p>Total: {selectedCountry.total}</p>
          <p className="critical">Critical: {selectedCountry.critical}</p>
          <p className="high">High: {selectedCountry.high}</p>
          <p className="medium">Medium: {selectedCountry.medium}</p>
          <p className="low">Low: {selectedCountry.low}</p>

        </div>
      )}

    </div>
  );
}
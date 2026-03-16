"use client";

import { useEffect, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Line,
  Marker
} from "react-simple-maps";

import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api";

type Attack = {
  source_ip: string;
  destination_ip: string;
  source_lat?: number;
  source_lon?: number;
  dest_lat?: number;
  dest_lon?: number;
  risk_score?: number;
};

type GeographyType = {
  rsmKey: string;
};

export default function AttackMapPage() {

  const [attacks, setAttacks] = useState<Attack[]>([]);

  useEffect(() => {

    const load = async () => {

      try {

        const res = await apiFetch("/api/live-network");

        if (Array.isArray(res)) {
          setAttacks(res);
        }

      } catch {

        // silent error for production

      }

    };

    load();

    const interval = setInterval(load, 5000);

    return () => clearInterval(interval);

  }, []);

  return (

    <div className="p-6 text-white max-w-[1400px] mx-auto">

      <h1 className="text-2xl mb-4">
        Global Attack Map
      </h1>

      <ComposableMap
        projectionConfig={{ scale: 150 }}
        className="bg-slate-900 rounded border border-slate-700"
      >

        <Geographies geography="https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json">

          {({ geographies }: { geographies: GeographyType[] }) =>
            geographies.map((geo: GeographyType) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill="#1e293b"
                stroke="#334155"
              />
            ))
          }

        </Geographies>

        {attacks.map((a, i) => {

          if (
            !a.source_lat ||
            !a.source_lon ||
            !a.dest_lat ||
            !a.dest_lon
          )
            return null;

          const color =
            a.risk_score && a.risk_score > 70
              ? "#ef4444"
              : a.risk_score && a.risk_score > 40
              ? "#f59e0b"
              : "#22c55e";

          return (

            <g key={i}>

              {/* Original attack line */}

              <Line
                from={[a.source_lon, a.source_lat]}
                to={[a.dest_lon, a.dest_lat]}
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
              />

              {/* Moving attack beam */}

              <motion.circle
                r={3}
                fill={color}
                animate={{
                  cx: [a.source_lon, a.dest_lon],
                  cy: [a.source_lat, a.dest_lat]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />

            </g>

          );

        })}

        {attacks.map((a, i) => {

          if (!a.dest_lat || !a.dest_lon) return null;

          return (

            <Marker
              key={`dest-${i}`}
              coordinates={[a.dest_lon, a.dest_lat]}
            >

              {/* Original marker */}

              <circle r={4} fill="#3b82f6" />

              {/* Pulsing effect */}

              <motion.circle
                r={10}
                fill="#3b82f6"
                initial={{ opacity: 0.6, scale: 0.5 }}
                animate={{ opacity: 0, scale: 2 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity
                }}
              />

            </Marker>

          );

        })}

      </ComposableMap>

    </div>

  );

}
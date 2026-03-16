"use client";

import { useEffect, useState, useRef } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { apiFetch } from "@/lib/api";

type Flow = {
  source_ip: string;
  destination_ip: string;
  risk_score?: number;
};

type GraphNode = {
  id: string;
  type: "attacker" | "target";
};

type GraphLink = {
  source: string;
  target: string;
  value: number;
  risk: number;
};

type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

export default function AttackFlowPage() {

  const [data, setData] = useState<GraphData | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const [size, setSize] = useState({
    width: 1200,
    height: 650
  });

  /* ================= HANDLE RESIZE ================= */

  useEffect(() => {

    function updateSize() {

      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();

      setSize({
        width: rect.width,
        height: rect.height
      });

    }

    updateSize();

    window.addEventListener("resize", updateSize);

    return () => window.removeEventListener("resize", updateSize);

  }, []);

  /* ================= LOAD GRAPH DATA ================= */

  useEffect(() => {

    async function load() {

      try {

        const res = await apiFetch("/api/live-network");

        if (!Array.isArray(res)) return;

        const nodes: Record<string, GraphNode> = {};
        const linkMap: Record<string, GraphLink> = {};

        res.forEach((item: Flow) => {

          if (!item.source_ip || !item.destination_ip) return;

          if (!nodes[item.source_ip]) {
            nodes[item.source_ip] = {
              id: item.source_ip,
              type: "attacker"
            };
          }

          if (!nodes[item.destination_ip]) {
            nodes[item.destination_ip] = {
              id: item.destination_ip,
              type: "target"
            };
          }

          const key = `${item.source_ip}-${item.destination_ip}`;

          if (!linkMap[key]) {
            linkMap[key] = {
              source: item.source_ip,
              target: item.destination_ip,
              value: 0,
              risk: item.risk_score || 0
            };
          }

          linkMap[key].value += 1;

        });

        setData({
          nodes: Object.values(nodes),
          links: Object.values(linkMap)
        });

      } catch {

        // silent fail for production

      }

    }

    load();

    const interval = setInterval(load, 5000);

    return () => clearInterval(interval);

  }, []);

  if (!data) {

    return (
      <div className="p-6 text-white max-w-[1200px] mx-auto">
        Loading attack graph...
      </div>
    );

  }

  return (

    <div className="p-6 text-white max-w-[1400px] mx-auto">

      <h1 className="text-2xl mb-4">
        Attack Flow Graph
      </h1>

      {/* GRAPH CONTAINER */}

      <div
        ref={containerRef}
        className="w-full h-[650px] bg-[#0f172a] border border-slate-700 rounded-xl p-4 overflow-hidden"
      >

        <ForceGraph2D<GraphNode, GraphLink>

          width={size.width}
          height={size.height}

          graphData={data}

          nodeLabel={(node: GraphNode) => node.id}

          nodeColor={(node: GraphNode) =>
            node.type === "attacker" ? "#ef4444" : "#3b82f6"
          }

          linkWidth={(l: GraphLink) => Math.max(l.value / 5, 1)}

          linkColor={(link: GraphLink) => {

            if (link.risk > 70) return "#ef4444";
            if (link.risk > 40) return "#f59e0b";
            return "#22c55e";

          }}

          linkDirectionalParticles={2}

          linkDirectionalParticleSpeed={0.003}

          linkDirectionalParticleWidth={2}

          cooldownTicks={200}

          nodeRelSize={6}

        />

      </div>

    </div>

  );

}
"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { apiFetch } from "@/lib/api";

const ForceGraph2D = dynamic(
  () => import("react-force-graph-2d"),
  { ssr: false }
) as React.ComponentType<Record<string, unknown>>;

type GraphNode = {
  id: string;
  type?: string;
  reputation?: number;
  risk?: number;
  group?: string | number;
  x?: number;
  y?: number;
};

type GraphLink = {
  source: string | GraphNode;
  target: string | GraphNode;
  weight?: number;
};

type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

export default function NetworkGraphPage() {

  const containerRef = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = useState({
    width: 800,
    height: 600,
  });

  const [graphData, setGraphData] = useState<GraphData | null>(null);

  /* ===== Resize ===== */

  useEffect(() => {

    function updateSize() {

      if (containerRef.current) {

        setDimensions({
          width: containerRef.current.offsetWidth,
          height: 600,
        });

      }

    }

    updateSize();

    window.addEventListener("resize", updateSize);

    return () => window.removeEventListener("resize", updateSize);

  }, []);

  /* ===== Load Graph ===== */

  useEffect(() => {

    async function loadGraph() {

      try {

        const data = await apiFetch("/api/network-graph");

        if (data) {
          setGraphData(data);
        }

      } catch (err) {

        console.error("Graph load failed", err);

      }

    }

    loadGraph();

    const interval = setInterval(loadGraph, 5000);

    return () => clearInterval(interval);

  }, []);

  if (!graphData) {

    return (
      <div className="min-h-screen bg-[#020617] text-white p-10">
        Loading network graph...
      </div>
    );

  }

  return (

    <div className="min-h-screen bg-[#020617] text-white p-6">

      <h1 className="text-2xl font-bold mb-6">
        Network Attack Graph (Live Data)
      </h1>

      <div ref={containerRef} className="bg-slate-900 rounded-xl shadow-lg">

        <ForceGraph2D

          graphData={graphData}

          width={dimensions.width}
          height={dimensions.height}

          backgroundColor="#0f172a"

          nodeAutoColorBy="group"

          linkWidth={(link: GraphLink) =>
            Math.max(1, (link.weight || 1) / 2)
          }

          linkDirectionalParticles={2}

          linkDirectionalParticleSpeed={0.01}

          linkDirectionalParticleColor={() => "#ef4444"}

          nodeLabel={(node: GraphNode) =>
            `ID: ${node.id}
Type: ${node.type}
Risk: ${node.risk ?? 0}
Reputation: ${node.reputation ?? 0}`
          }

          nodeCanvasObject={(node: GraphNode, ctx: CanvasRenderingContext2D) => {

            const reputation = node.reputation || 0;

            let radius = 6;

            if (node.type === "core") radius = 14;
            else if (node.type === "asn") radius = 9;
            else if (reputation > 80) radius = 11;

            if (node.x === undefined || node.y === undefined) return;

            ctx.beginPath();

            ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);

            if (node.type === "core") ctx.fillStyle = "#22c55e";
            else if (node.type === "asn") ctx.fillStyle = "#6366f1";
            else
              ctx.fillStyle =
                reputation > 80
                  ? "#ef4444"
                  : reputation > 50
                  ? "#f97316"
                  : "#38bdf8";

            ctx.fill();

            if (node.type === "ip" && reputation > 80) {

              ctx.shadowColor = "red";
              ctx.shadowBlur = 25;

            } else {

              ctx.shadowBlur = 0;

            }

          }}

        />

      </div>

    </div>

  );

}
"use client";

import ForceGraph2D from "react-force-graph-2d";

type GraphNode = {
  id: string;
  group?: number;
};

type GraphLink = {
  source: string;
  target: string;
};

type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

type Props = {
  data: GraphData;
};

export default function GraphView({ data }: Props) {
  return <ForceGraph2D graphData={data} />;
}
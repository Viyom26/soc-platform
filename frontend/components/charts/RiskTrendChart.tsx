"use client";

import { LineChart, Line } from "recharts";

type RiskTrend = {
  risk: number;
  forecast: number;
};

type Props = {
  data: RiskTrend[];
};

export default function RiskTrendChart({ data }: Props) {
  return (
    <LineChart width={400} height={200} data={data}>
      <Line type="monotone" dataKey="risk" />
      <Line type="monotone" dataKey="forecast" strokeDasharray="5 5" />
    </LineChart>
  );
}
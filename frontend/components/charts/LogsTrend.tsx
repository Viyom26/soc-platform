"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type LogItem = {
  timestamp?: string;
};

type TrendPoint = {
  time: string;
  count: number;
};

export default function LogsTrend() {
  const [data, setData] = useState<TrendPoint[]>([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/logs")
      .then((r) => r.json())
      .then((res) => {
        const logs: LogItem[] =
          res?.items || res?.data || (Array.isArray(res) ? res : []);

        const grouped: Record<string, number> = {};

        logs.forEach((l: LogItem) => {
          if (!l.timestamp) return;

          const hour = l.timestamp.slice(0, 13);

          grouped[hour] = (grouped[hour] || 0) + 1;
        });

        setData(
          Object.entries(grouped).map(([time, count]) => ({
            time,
            count,
          }))
        );
      });
  }, []);

  return (
    <div className="bg-zinc-900 p-4 rounded border border-zinc-800 h-full">
      <h3 className="mb-2 font-bold">Logs Over Time</h3>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data}>
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Line dataKey="count" stroke="#3b82f6" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
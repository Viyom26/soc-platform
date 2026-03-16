"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type ComplianceReport = {
  total_alerts?: number;
  critical_alerts?: number;
  incidents?: number;
  open_incidents?: number;
  resolved_incidents?: number;
};

export default function CompliancePage() {

  const [report, setReport] = useState<ComplianceReport | null>(null);

  useEffect(() => {

    async function load() {

      try {

        const data = await apiFetch("/compliance/report");

        setReport(data);

      } catch {

        setReport(null);

      }

    }

    load();

  }, []);

  if (!report) {
    return <div className="p-6 text-white">Loading report...</div>;
  }

  return (
    <div className="p-6 text-white max-w-[1200px] mx-auto">

      <h1 className="text-2xl mb-6">Compliance Report</h1>

      <div className="bg-slate-800 p-4 rounded mb-3">
        Total Alerts: {report.total_alerts ?? 0}
      </div>

      <div className="bg-slate-800 p-4 rounded mb-3">
        Critical Alerts: {report.critical_alerts ?? 0}
      </div>

      <div className="bg-slate-800 p-4 rounded mb-3">
        Incidents: {report.incidents ?? 0}
      </div>

      <div className="bg-slate-800 p-4 rounded mb-3">
        Open Incidents: {report.open_incidents ?? 0}
      </div>

      <div className="bg-slate-800 p-4 rounded mb-3">
        Resolved Incidents: {report.resolved_incidents ?? 0}
      </div>

    </div>
  );
}
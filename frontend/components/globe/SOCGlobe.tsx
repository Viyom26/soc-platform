"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

type Alert = {
  lat?: number;
  lon?: number;
  severity?: string;
};

type Attack = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  severity?: string;
};

type Ring = {
  lat: number;
  lng: number;
};

type Props = {
  liveAlerts: Alert[];
  criticalCount?: number;
};

export default function SOCGlobe({
  liveAlerts,
  criticalCount = 0,
}: Props) {
  const [arcs, setArcs] = useState<Attack[]>([]);
  const [rings, setRings] = useState<Ring[]>([]);

  useEffect(() => {
    if (!liveAlerts?.length) return;

    const newArcs: Attack[] = liveAlerts.map((alert: Alert) => ({
      startLat: alert.lat || 20,
      startLng: alert.lon || 78,
      endLat: 37.77,
      endLng: -122.41,
      severity: alert.severity,
    }));

    /* Streaming arcs (keep last 20) */
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setArcs((prev) => [...prev.slice(-20), ...newArcs]);

    /* Critical pulse rings */
    const criticalRings: Ring[] = liveAlerts
      .filter((a: Alert) => a.severity === "CRITICAL")
      .map((a: Alert) => ({
        lat: a.lat || 20,
        lng: a.lon || 78,
      }));

    setRings(criticalRings);
  }, [liveAlerts]);

  return (
    <div style={{ height: "600px" }}>
      <Globe
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"

        /* AI GLOW */
        atmosphereColor="red"
        atmosphereAltitude={criticalCount > 5 ? 0.4 : 0.2}

        /* ATTACK ARCS */
        arcsData={arcs}
        arcColor={(d: unknown): string[] => {
          const arc = d as Attack;
          if (arc.severity === "CRITICAL") return ["#ff0000"];
          if (arc.severity === "HIGH") return ["#ff8800"];
          return ["#00ff00"];
        }}
        arcDashLength={0.4}
        arcDashGap={4}
        arcDashAnimateTime={1000}

        /* CRITICAL PULSE */
        ringsData={rings}
        ringColor={() => "#ff0000"}
        ringMaxRadius={8}
        ringPropagationSpeed={4}
        ringRepeatPeriod={700}
      />
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
function getFlag(country?: string) {
  if (!country || country === 'Unknown') return '🌐';

  const code = country.slice(0, 2).toUpperCase();

  return code.replace(/./g, (c) =>
    String.fromCodePoint(127397 + c.charCodeAt(0))
  );
}

type NetworkEvent = {
  source_ip: string;
  destination_ip: string;
  destinations?: string[]; // ✅ ADD THIS
  connection_type?: string;
  threat?: string;
  attack_count?: number;
  country?: string;
  risk_score?: number;
  risk_level?: string;
  confidence?: number;
  event_time?: string;
  protocol?: string; // keep this
};

type Talker = {
  ip: string;
  connections: number;
};

export default function LiveNetworkPage() {
  const [events, setEvents] = useState<NetworkEvent[]>([]);
  const [talkers, setTalkers] = useState<Talker[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);

  const router = useRouter();
  const topSource =
    events.length > 0
      ? events.reduce((acc, curr) =>
          (curr.attack_count ?? 0) > (acc.attack_count ?? 0) ? curr : acc
        ).source_ip
      : null;

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const res = await apiFetch('/api/live-network');

        if (mounted && Array.isArray(res)) {
          setEvents(res);
        }

        const top = await apiFetch('/api/live-network/top-talkers');

        if (mounted && Array.isArray(top)) {
          setTalkers(top);
        }
      } catch (err) {
        console.error('Live network error:', err);
      }
    };

    load();

    const interval = setInterval(() => {
      if (!paused) load();
    }, 10000);

    // 🔥 ADD WEBSOCKET BELOW
    const ws = new WebSocket(
      process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:8000/ws/alerts'
    );

    ws.onmessage = (event) => {
      if (paused) return;
      const data = JSON.parse(event.data);

      if (data.type === 'LIVE_TRAFFIC') {
        setEvents((prev) => {
          const existing = prev.find(
            (e) =>
              e.source_ip === data.source_ip &&
              e.destination_ip === data.destination_ip
          );

          let updated;

          if (existing) {
            // 🔥 MERGE (DO NOT OVERWRITE)
            updated = {
              ...existing,
              ...data,

              // ✅ PRESERVE OLD VALUES IF NEW MISSING
              connection_type: data.connection_type ?? existing.connection_type,
              risk_score: data.risk_score ?? existing.risk_score,
              risk_level: data.risk_level ?? existing.risk_level,
              confidence: data.confidence ?? existing.confidence,
              threat: data.threat ?? existing.threat,
              country: data.country ?? existing.country,
            };
          } else {
            updated = data;
          }

          const filtered = prev.filter(
            (e) =>
              !(
                e.source_ip === data.source_ip &&
                e.destination_ip === data.destination_ip
              )
          );

          return [updated, ...filtered].slice(0, 200);
        });
      }
    };

    return () => {
      mounted = false;
      clearInterval(interval);
      ws.close(); // 🔥 ADD THIS
    };
  }, [paused]);

  const riskColor = (level?: string) => {
    if (level === 'HIGH') return 'bg-orange-500';
    if (level === 'MEDIUM') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl mb-6 flex items-center gap-3">
        Live Network Monitoring
        <span className="text-xs ml-2 px-2 py-1 rounded bg-slate-800">
          {paused ? '⏸ Paused' : '🟢 Live'}
        </span>
      </h1>
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setPaused(false)}
          disabled={!paused}
          className="bg-green-600 px-3 py-1 rounded"
        >
          ▶ Resume
        </button>

        <button
          onClick={() => setPaused(true)}
          disabled={paused}
          className="bg-yellow-600 px-3 py-1 rounded"
        >
          ⏸ Pause
        </button>

        <button
          onClick={async () => {
            try {
              const res = await apiFetch('/api/live-network');
              if (Array.isArray(res)) setEvents(res);

              const top = await apiFetch('/api/live-network/top-talkers');
              if (Array.isArray(top)) setTalkers(top);
            } catch (err) {
              console.error('Manual refresh error:', err);
            }
          }}
          className="bg-blue-600 px-3 py-1 rounded"
        >
          🔄 Refresh
        </button>
      </div>

      {/* TOP TALKERS */}

      {talkers.length > 0 && (
        <div className="mb-6 bg-slate-900 border border-slate-700 rounded p-4">
          <h2 className="text-lg mb-3">Top Talkers</h2>

          <div className="grid grid-cols-5 gap-2 text-sm">
            {talkers.map((t, i) => (
              <div
                key={i}
                className="bg-slate-800 p-2 rounded flex justify-between"
              >
                <span className="text-blue-400">{t.ip}</span>
                <span>{t.connections}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {events.length === 0 && (
        <p className="text-slate-400">No live network activity detected.</p>
      )}

      {events.length > 0 && (
        <div className="bg-slate-900 border border-slate-700 rounded overflow-x-auto">
          <div className="grid grid-cols-[2.5fr_1fr_1fr_1fr_2fr_1fr_1fr_1fr] text-sm text-slate-300 border-b border-slate-700 p-3 font-semibold">
            <div>Attack Flow</div>
            <div>Type</div>
            <div>Country</div>
            <div>Attacks</div>
            <div>Risk Score</div>
            <div>Risk Level</div>
            <div>Confidence</div>
            <div>Threat</div>
          </div>

          {events.map((e, i) => {
            const key = `${e.source_ip}-${e.destination_ip}-${i}`;

            return (
              <div key={key}>
                <div
                  className="grid grid-cols-[2.5fr_1fr_1fr_1fr_2fr_1fr_1fr_1fr] items-center text-sm p-3 border-b border-slate-800 hover:bg-slate-800 cursor-pointer transition"
                  onClick={() => setExpanded(expanded === key ? null : key)}
                >
                  <div className="break-all leading-tight pr-2 relative">
                    <div className="absolute left-0 top-1/2 w-full h-[1px] bg-green-500 opacity-20"></div>
                    <span
                      className={`block ${
                        e.source_ip === topSource
                          ? 'text-red-500 animate-pulse font-bold'
                          : 'text-red-400'
                      }`}
                    >
                      {e.source_ip}
                    </span>
                    <span className="text-green-400 text-xs animate-pulse">
                      →
                    </span>
                    <span className="text-blue-400 block">
                      {e.destination_ip}
                    </span>

                    {e.destinations && e.destinations.length > 5 && (
                      <span className="absolute right-0 top-0 text-[10px] bg-red-600 px-2 py-[2px] rounded animate-pulse">
                        SCAN
                      </span>
                    )}
                  </div>

                  <div className="whitespace-nowrap text-center">
                    {e.connection_type ?? '-'}
                  </div>

                  <div className="flex items-center gap-1">
                    <span>{getFlag(e.country)}</span>
                    <span>{e.country ?? 'Unknown'}</span>
                  </div>

                  <div>{e.attack_count ?? 0}</div>

                  <div className="flex items-center gap-2">
                    <div className="w-full bg-slate-700 rounded h-2">
                      <div
                        className="bg-red-500 h-2 rounded"
                        style={{ width: `${e.risk_score ?? 0}%` }}
                      />
                    </div>

                    <span className="text-xs">{e.risk_score ?? 0}</span>
                  </div>

                  <div>
                    <span
                      className={`text-xs px-2 py-1 rounded ${riskColor(e.risk_level)}`}
                    >
                      {e.risk_level ?? 'LOW'}
                    </span>
                  </div>

                  <div>{e.confidence ?? 0}%</div>

                  <div>{e.threat ?? 'Normal Traffic'}</div>
                </div>

                {expanded === key && (
                  <div className="p-4 bg-slate-950 border-b border-slate-800">
                    <div className="font-semibold mb-3">
                      Attack Count: {e.attack_count ?? 0}
                    </div>

                    {e.destinations && (
                      <div className="mt-2 text-xs text-slate-300">
                        <div className="mb-1 font-semibold">Destinations:</div>
                        {e.destinations.map((d: string, idx: number) => (
                          <div key={idx} className="text-blue-400">
                            {d}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        className="bg-slate-800 px-3 py-2 rounded hover:bg-slate-700"
                        onClick={() =>
                          router.push(`/threat-intel?source_ip=${e.source_ip}`)
                        }
                      >
                        View All Destinations
                      </button>

                      <button
                        className="bg-slate-800 px-3 py-2 rounded hover:bg-slate-700"
                        onClick={() =>
                          router.push(
                            `/threat-intel?destination_ip=${e.destination_ip}`
                          )
                        }
                      >
                        View All Attackers
                      </button>
                    </div>
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

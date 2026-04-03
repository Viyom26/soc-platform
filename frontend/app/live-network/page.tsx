'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

type NetworkEvent = {
  source_ip: string;
  destination_ip: string;
  connection_type?: string;
  threat?: string;
  attack_count?: number;
  country?: string;
  risk_score?: number;
  risk_level?: string;
  confidence?: number;
  event_time?: string;
};

type Talker = {
  ip: string;
  connections: number;
};

export default function LiveNetworkPage() {
  const [events, setEvents] = useState<NetworkEvent[]>([]);
  const [talkers, setTalkers] = useState<Talker[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const router = useRouter();

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

    const interval = setInterval(load, 5000);

    // 🔥 ADD WEBSOCKET BELOW
    const ws = new WebSocket(
      process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:8000/ws/alerts'
    );

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'LIVE_TRAFFIC') {
        setEvents((prev) => [data, ...prev.slice(0, 100)]);
      }
    };

    return () => {
      mounted = false;
      clearInterval(interval);
      ws.close(); // 🔥 ADD THIS
    };
  }, []);

  const riskColor = (level?: string) => {
    if (level === 'HIGH') return 'bg-orange-500';
    if (level === 'MEDIUM') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl mb-6">Live Network Monitoring</h1>

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
          <div className="grid grid-cols-8 text-sm text-slate-300 border-b border-slate-700 p-3 font-semibold">
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
                  className="grid grid-cols-8 items-center text-sm p-3 border-b border-slate-800 hover:bg-slate-800 cursor-pointer transition"
                  onClick={() => setExpanded(expanded === key ? null : key)}
                >
                  <div>
                    <span className="text-red-400">{e.source_ip}</span>
                    {' → '}
                    <span className="text-blue-400">{e.destination_ip}</span>
                  </div>

                  <div>{e.connection_type ?? '-'}</div>

                  <div>{e.country ?? 'Unknown'}</div>

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

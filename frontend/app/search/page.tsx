'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';

export default function SearchPage() {
  const [sourceIp, setSourceIp] = useState('');
  const [destinationIp, setDestinationIp] = useState('');
  const [severity, setSeverity] = useState('');
  const [protocol, setProtocol] = useState('');

  type LogResult = {
    source_ip?: string;
    destination_ip?: string;
    source_port?: string;
    destination_port?: string;
    protocol?: string;
    severity?: string;
    risk_score?: number;
    message?: string;
    created_at?: string;
  };

  const [results, setResults] = useState<LogResult[]>([]);

  // ✅ AUTO LOAD LOGS WHEN PAGE OPENS
  useEffect(() => {
    const loadLogs = async () => {
      try {
        const data = await apiFetch(`/api/search?page=1&limit=100`);

        console.log('INITIAL LOAD:', data); // debug

        if (data?.items) {
          setResults(data.items);
        }
      } catch (err) {
        console.error('Load error:', err);
      }
    };

    loadLogs();
  }, []);

  const search = async () => {
    const query = `/api/search?source_ip=${sourceIp}&destination_ip=${destinationIp}&protocol=${protocol}&severity=${severity}&page=1&limit=100`;

    const data = await apiFetch(query);

    console.log('SEARCH DATA:', data); // 🔥 debug

    if (data?.items) {
      setResults(data.items);
    } else {
      setResults([]);
    }
  };

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl mb-4">Advanced Search</h1>

      {/* INPUTS */}
      <div className="flex gap-2 flex-wrap">
        <input
          placeholder="Source IP"
          value={sourceIp}
          onChange={(e) => setSourceIp(e.target.value)}
          className="p-2 text-black"
        />

        <input
          placeholder="Destination IP"
          value={destinationIp}
          onChange={(e) => setDestinationIp(e.target.value)}
          className="p-2 text-black"
        />

        <select
          aria-label="Severity"
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="p-2 bg-slate-800 text-white border border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-blue-400 transition"
        >
          <option value="" className="text-gray-400">
            Severity
          </option>
          <option>LOW</option>
          <option>MEDIUM</option>
          <option>HIGH</option>
          <option>CRITICAL</option>
        </select>

        <select
          aria-label="Protocol"
          value={protocol}
          onChange={(e) => setProtocol(e.target.value)}
          className="p-2 bg-slate-800 text-white border border-slate-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-blue-400 transition"
        >
          <option value="" className="text-gray-400">
            Protocol
          </option>
          <option>TCP</option>
          <option>UDP</option>
          <option>HTTP</option>
          <option>HTTPS</option>
        </select>

        <button onClick={search} className="bg-green-600 px-3 py-2">
          Search
        </button>
      </div>

      {/* RESULTS */}
      <div className="mt-6">
        {results.length === 0 && (
          <p className="text-gray-400">
            No results found (try clicking Search or wait for data load)
          </p>
        )}

        {results.length > 0 && (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm border border-gray-700">
              <thead className="bg-gray-800">
                <tr>
                  <th className="p-2">Source IP</th>
                  <th className="p-2">Destination IP</th>
                  <th className="p-2">Src Port</th>
                  <th className="p-2">Dst Port</th>
                  <th className="p-2">Protocol</th>
                  <th className="p-2">Severity</th>
                  <th className="p-2">Risk</th>
                  <th className="p-2">Threat</th>
                  <th className="p-2">Time</th>
                </tr>
              </thead>

              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-t border-gray-700">
                    <td className="p-2 text-green-400">
                      {r.source_ip || 'N/A'}
                    </td>
                    <td className="p-2 text-blue-400">
                      {r.destination_ip || 'N/A'}
                    </td>
                    <td className="p-2">{r.source_ip || 'N/A'}</td>
                    <td className="p-2">{r.destination_ip || 'N/A'}</td>
                    <td className="p-2">{r.source_port || 'N/A'}</td>
                    <td className="p-2">{r.destination_port || 'N/A'}</td>
                    <td className="p-2">{r.protocol || 'N/A'}</td>
                    <td className="p-2">{r.severity || 'N/A'}</td>
                    <td className="p-2">{r.risk_score ?? 'N/A'}</td>
                    <td className="p-2">{r.message || 'N/A'}</td>
                    <td className="p-2">
                      {r.created_at
                        ? new Date(r.created_at).toLocaleString()
                        : 'N/A'}
                    </td>

                    <td
                      className="p-2 font-semibold"
                      style={{
                        color:
                          r.severity === 'CRITICAL'
                            ? '#ef4444'
                            : r.severity === 'HIGH'
                              ? '#f97316'
                              : r.severity === 'MEDIUM'
                                ? '#eab308'
                                : '#22c55e',
                      }}
                    >
                      {r.severity || 'N/A'}
                    </td>

                    <td className="p-2">{r.risk_score ?? 'N/A'}</td>
                    <td className="p-2">{r.message || 'N/A'}</td>

                    <td className="p-2">
                      {r.created_at
                        ? new Date(r.created_at).toLocaleString('en-IN')
                        : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

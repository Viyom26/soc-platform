"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import Card from "@/components/ui/Card";

type TimelineEvent = {
  message?: string;
  severity?: string;
  timestamp?: string;
  mitre_tactic?: string;
  mitre_technique?: string;
};

type Intel = {
  country?: string;
  isp?: string;
  reputation?: number;
  risk_score?: number;
  related_incidents?: number;
  first_seen?: string;
  last_seen?: string;
};

type Comment = {
  comment: string;
  created_at: string;
};

export default function IncidentTimeline() {

  const params = useParams();
  const ip = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [intel, setIntel] = useState<Intel | null>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");

  const isPrivate =
    ip?.startsWith("10.") ||
    ip?.startsWith("192.168.") ||
    ip?.startsWith("172.");

  const formatTime = (t: string) => {
    try {
      return new Date(t).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      });
    } catch {
      return t;
    }
  };

  useEffect(() => {

    if (!ip) return;

    async function loadTimeline() {

      try {

        const timelineData = await apiFetch(`/api/incidents/${ip}/timeline`);
        const intelData = await apiFetch(`/api/ip-intel/${ip}`);
        const commentData = await apiFetch(`/comments/${ip}`);

        setIntel(intelData);
        setComments(Array.isArray(commentData) ? commentData : []);
        setTimeline(Array.isArray(timelineData) ? timelineData : []);

      } catch {

        setTimeline([]);

      } finally {

        setLoading(false);

      }

    }

    loadTimeline();

  }, [ip]);

  async function addComment() {
    if (!text.trim() || !ip) return;

    try {

      await apiFetch(`/comments/${ip}?text=${encodeURIComponent(text)}`, {
        method: "POST",
      });

      setText("");

      const updated = await apiFetch(`/comments/${ip}`);
      setComments(Array.isArray(updated) ? updated : []);

    } catch (err) {
      console.error("Comment add failed", err);
    }
  }

  return (
    <>
      <h2 className="text-xl font-semibold">Incident Timeline</h2>
      <p className="text-sm text-slate-500">{ip}</p>

      {intel && (
        <div className="glass-card mb-4 p-4">

          <h3 className="text-lg font-semibold mb-2">
            IP Intelligence
          </h3>

          <div className="grid grid-cols-2 gap-4 text-sm">

            <p><b>Country:</b> {intel.country || (isPrivate ? "Internal Network" : "Unknown")}</p>
            <p><b>ISP:</b> {intel.isp || (isPrivate ? "Internal Infrastructure" : "Unknown")}</p>
            <p><b>Reputation:</b> {intel.reputation ?? (isPrivate ? "Internal Host" : "Unknown")}</p>
            <p><b>Risk Score:</b> {intel.risk_score ?? (isPrivate ? "Calculated by SOC" : "Unknown")}</p>
            <p><b>Related Incidents:</b> {intel.related_incidents ?? 0}</p>
            <p><b>First Seen:</b> {intel.first_seen ? formatTime(intel.first_seen) : "-"}</p>
            <p><b>Last Seen:</b> {intel.last_seen ? formatTime(intel.last_seen) : "-"}</p>

          </div>

        </div>
      )}

      <Card className="p-4">

        {loading ? (
          <p className="text-sm text-slate-400">Loading timeline...</p>
        ) : timeline.length === 0 ? (
          <p className="text-sm text-slate-400">No timeline data available</p>
        ) : (

          <div className="space-y-4">

            {timeline.map((e, i) => {

              const sev = (e.severity || "").toUpperCase();

              return (
                <div key={i} className="flex gap-4">

                  <div className="w-2 h-2 mt-2 rounded-full bg-slate-400" />

                  <div>

                    <p className="text-sm">{e.message}</p>

                    {e.mitre_technique && (
                      <p className="text-xs text-blue-400">
                        MITRE: {e.mitre_tactic} ({e.mitre_technique})
                      </p>
                    )}

                    <span className={`text-xs font-semibold
                      ${
                        sev === "CRITICAL"
                          ? "text-red-600"
                          : sev === "HIGH"
                          ? "text-red-500"
                          : sev === "MEDIUM"
                          ? "text-yellow-500"
                          : "text-green-600"
                      }`}>
                      {sev}
                    </span>

                    {e.timestamp && (
                      <p className="text-xs text-slate-400">
                        {formatTime(e.timestamp)}
                      </p>
                    )}

                  </div>

                </div>
              );
            })}

          </div>

        )}

      </Card>

      <Card className="p-4">

        <h3 className="text-lg font-semibold mb-2">
          Analyst Comments
        </h3>

        {comments.map((c, i) => (
          <div key={i} className="mb-3 border-b pb-2">
            <p className="text-sm">{c.comment}</p>
            <p className="text-xs text-slate-400">
              {formatTime(c.created_at)}
            </p>
          </div>
        ))}

        <textarea
          className="w-full border rounded p-2 text-sm mt-2"
          placeholder="Write investigation note..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <button
          onClick={addComment}
          className="mt-2 px-3 py-1 bg-blue-600 text-white rounded"
        >
          Add Comment
        </button>

      </Card>

    </>
  );
}
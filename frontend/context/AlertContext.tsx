"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";

type AlertItem = {
  id: string;
  severity: string;
  message: string;
  timestamp: string;
};

type AlertContextType = {
  alerts: AlertItem[];
  unread: number;
  markAllRead: () => void;
};

const AlertContext = createContext<AlertContextType | null>(null);

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [unread, setUnread] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
const reconnectRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  function connect() {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    wsRef.current = new WebSocket("ws://127.0.0.1:8000/ws/alerts");

    wsRef.current.onopen = () => {
      console.log("✅ WS CONNECTED");
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);

      const newAlert = {
        id: crypto.randomUUID(),
        severity: data.severity || "LOW",
        message: data.source_ip || "Unknown IP",
        timestamp: new Date().toISOString(),
      };

      setAlerts((prev) => [newAlert, ...prev]);
      setUnread((prev) => prev + 1);
    };

    wsRef.current.onerror = () => {
      console.warn("⚠️ WS error ignored");
    };

    wsRef.current.onclose = () => {
      reconnectRef.current = setTimeout(connect, 5000);
    };
  }

  connect();

  return () => {
    if (reconnectRef.current) clearTimeout(reconnectRef.current);
    if (wsRef.current) wsRef.current.close();
  };
}, []);

  function markAllRead() {
    setUnread(0);
  }

  return (
    <AlertContext.Provider value={{ alerts, unread, markAllRead }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertContext);
  if (!context) throw new Error("AlertProvider missing");
  return context;
}
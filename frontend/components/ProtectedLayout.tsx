"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem("access_token")) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 240,
          background: "#0f172a",
          color: "#fff",
          padding: 20,
        }}
      >
        <h2>SOC Platform</h2>

        <nav style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/logs">Logs</Link>
          <Link href="/alerts">Alerts</Link>
          <Link href="/incidents">Incidents</Link>
          <Link href="/reports">Reports</Link>
        </nav>

        <button
          style={{ marginTop: 20, background: "red", color: "#fff" }}
          onClick={() => {
            localStorage.removeItem("access_token");
            router.replace("/login");
          }}
        >
          Logout
        </button>
      </aside>

      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}
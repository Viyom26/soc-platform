"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Sidebar() {
  const router = useRouter();

  const logout = () => {
    localStorage.removeItem("access_token");
    router.replace("/login");
  };

  return (
    <aside className="sidebar">
      <h2 className="logo">SOC Platform</h2>

      <nav className="nav">
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/logs">Logs Intelligence</Link>
        <Link href="/alerts">Alerts</Link>
        <Link href="/incidents">Incidents</Link>
        <Link href="/reports">Reports</Link>
      </nav>

      <button className="logout" onClick={logout}>
        Logout
      </button>
    </aside>
  );
}
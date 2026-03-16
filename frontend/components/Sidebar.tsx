"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import "./sidebar.css";

type Role = "ADMIN" | "ANALYST" | "VIEWER" | null;

export default function Sidebar() {

  const pathname = usePathname();

  const [role, setRole] = useState<Role>(null);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  /* ================= LOAD ROLE FROM TOKEN ================= */

  useEffect(() => {

    if (typeof window === "undefined") return;

    const token = localStorage.getItem("access_token");

    if (!token) {
      /* eslint-disable-next-line react-hooks/set-state-in-effect */
      setRole(null);
      return;
    }

    try {

      const parts = token.split(".");

      if (parts.length < 2) {
        setRole(null);
        return;
      }

      const payloadBase64 = parts[1];

      const decoded = JSON.parse(atob(payloadBase64));

      if (decoded && decoded.role) {
        setRole(decoded.role);
      } else {
                setRole(null);
      }

    } catch (err) {

      console.warn("Token decode failed", err);

            setRole(null);

    }

  }, []);

  /* ================= LOGOUT ================= */

  function handleLogout() {

    try {
      localStorage.removeItem("access_token");
    } catch {}

    window.location.href = "/login";

  }

  /* ================= SIDEBAR MENU ================= */

  const menu = [

    { name: "Dashboard", path: "/dashboard", icon: "🏠", roles: ["ADMIN", "ANALYST", "VIEWER"] },

    { name: "Logs", path: "/logs", icon: "📜", roles: ["ADMIN", "ANALYST", "VIEWER"] },

    { name: "Alerts", path: "/alerts", icon: "🚨", roles: ["ADMIN", "ANALYST", "VIEWER"] },

    { name: "Incidents", path: "/incidents", icon: "📂", roles: ["ADMIN", "ANALYST"] },

    { name: "IP Analyzer", path: "/ip-analyzer", icon: "🧠", roles: ["ADMIN", "ANALYST", "VIEWER"] },

    { name: "Geo Map", path: "/geo-map", icon: "🗺️", roles: ["ADMIN", "ANALYST", "VIEWER"] },

    { name: "Country Heatmap", path: "/country-heatmap", icon: "🌍", roles: ["ADMIN", "ANALYST", "VIEWER"] },

    { name: "Detection Rules", path: "/rules", icon: "📜", roles: ["ADMIN"] },

    { name: "Attack Timeline", path: "/attack-timeline", icon: "⏱", roles: ["ADMIN", "ANALYST"] },

    { name: "Threat Intel", path: "/threat-intel", icon: "📊", roles: ["ADMIN", "ANALYST"] },

    { name: "Live Network", path: "/live-network", icon: "📡", roles: ["ADMIN", "ANALYST"] },

    { name: "Attack Map", path: "/attack-map", icon: "🌐", roles: ["ADMIN", "ANALYST"] },

    { name: "Attack Flow", path: "/attack-flow", icon: "🧭", roles: ["ADMIN", "ANALYST"] },

    { name: "Log Sources", path: "/log-sources", icon: "🖥", roles: ["ADMIN"] },

    { name: "Compliance Reports", path: "/compliance", icon: "📑", roles: ["ADMIN"] },

    { name: "Live Attack Stream", path: "/live-attacks", icon: "⚡", roles: ["ADMIN","ANALYST"] },

    { name: "MITRE Map", path: "/mitre-map", icon: "🧬", roles: ["ADMIN", "ANALYST"] },

    { name: "AI Prediction", path: "/ai-prediction", icon: "🤖", roles: ["ADMIN"] },

    { name: "Command Center", path: "/command-center", icon: "🎯", roles: ["ADMIN"] },

    { name: "Audit Logs", path: "/audit-logs", icon: "📁", roles: ["ADMIN"] },

  ];

  return (
    <>

      {/* ================= MOBILE TOGGLE ================= */}

      <button
        className="menu-toggle"
        onClick={() => setOpen(!open)}
      >
        ☰
      </button>

      {open && (
        <div
          className="sidebar-overlay"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ================= SIDEBAR ================= */}

      <aside
        className={`sidebar ${open ? "open" : ""} ${collapsed ? "collapsed" : ""}`}
      >

        <div>

          {/* ================= HEADER ================= */}

          <div className="sidebar-header">

            <div className="logo-area">
              🛡
              {!collapsed && (
                <span className="logo-text">
                  AttackSurface SOC
                </span>
              )}
            </div>

            <button
              className="collapse-btn"
              onClick={() => {
                const newState = !collapsed;
                setCollapsed(newState);

                if (typeof document !== "undefined") {
                  document.documentElement.style.setProperty(
                    "--sidebar-width",
                    newState ? "80px" : "260px"
                  );
                }
              }}
            >
              {collapsed ? "➡" : "⬅"}
            </button>

          </div>

          {/* ================= NAVIGATION ================= */}

          <nav className="sidebar-nav">

            {menu
              .filter((item) => {
                if (!role) return false;
                return item.roles.includes(role);
              })
              .map((item) => {

                const active =
                  pathname === item.path ||
                  pathname?.startsWith(item.path + "/");

                return (

                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setOpen(false)}
                    className={
                      active
                        ? "sidebar-link active"
                        : "sidebar-link"
                    }
                  >

                    <span>{item.icon}</span>

                    {!collapsed && (
                      <span>{item.name}</span>
                    )}

                  </Link>

                );

              })}

          </nav>

        </div>

        {/* ================= FOOTER ================= */}

        <div className="sidebar-footer">

          <button
            className="logout-btn"
            onClick={handleLogout}
          >
            🚪 {!collapsed && "Logout"}
          </button>

        </div>

      </aside>

    </>
  );

}
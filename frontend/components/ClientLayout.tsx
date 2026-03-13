"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { AlertProvider } from "@/context/AlertContext";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const router = useRouter();
  const pathname = usePathname();

  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const isAuthPage =
    pathname === "/login" || pathname === "/register";

  /* ================= AUTH CHECK ================= */

  useEffect(() => {

    if (typeof window === "undefined") return;

    const token = localStorage.getItem("access_token");
    setAuthenticated(!!token);

  }, [pathname]);

  /* ================= REDIRECT CONTROL ================= */

  useEffect(() => {

    if (authenticated === null) return;

    if (!authenticated && !isAuthPage) {
      router.replace("/login");
    }

    if (authenticated && isAuthPage) {
      router.replace("/dashboard");
    }

  }, [authenticated, isAuthPage, router]);

  /* ================= LOAD SAVED THEME ================= */

  useEffect(() => {

    if (typeof window === "undefined") return;

    const savedTheme =
      (localStorage.getItem("theme") as "dark" | "light") || "dark";

    setTheme(savedTheme);

    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(savedTheme);

  }, []);

  /* ================= TOGGLE THEME ================= */

  function toggleTheme() {

    const newTheme = theme === "dark" ? "light" : "dark";

    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(newTheme);

  }

  /* ================= LOADING STATE ================= */

  if (authenticated === null) return null;

  /* ================= AUTH PAGES ================= */

  if (!authenticated) {
    return <>{children}</>;
  }

  /* ================= MAIN LAYOUT ================= */

  return (
    <AlertProvider>

      <div className="enterprise-container">

        <Sidebar />

        <main className="enterprise-content with-sidebar">

          {/* TOP BAR */}

          <div className="topbar-fixed">

            <div className="topbar-inner">

              <h1 className="app-title">
                AttackSurface SOC
              </h1>

              <button
                onClick={toggleTheme}
                className="theme-toggle-btn"
              >
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>

            </div>

          </div>

          {/* PAGE CONTENT */}

          <div className="page-content">

            <div className="page-inner-container">

              {children}

            </div>

          </div>

        </main>

      </div>

    </AlertProvider>
  );

}
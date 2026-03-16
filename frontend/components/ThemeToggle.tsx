"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  /* ================= LOAD SAVED THEME ================= */

useEffect(() => {
  const savedTheme =
    (localStorage.getItem("theme") as Theme) || "dark";

  /* eslint-disable-next-line react-hooks/set-state-in-effect */
  setTheme(savedTheme);

  document.documentElement.classList.remove("dark", "light");
  document.documentElement.classList.add(savedTheme);

  setMounted(true);
}, []);

  /* ================= TOGGLE THEME ================= */

  function toggleTheme() {
    const newTheme: Theme = theme === "dark" ? "light" : "dark";

    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);

    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(newTheme);
  }

  /* Prevent hydration mismatch */

  if (!mounted) return null;

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle-btn"
      style={{
        padding: "6px 14px",
        borderRadius: "8px",
        background: "#2563eb",
        color: "#ffffff",
        border: "none",
        cursor: "pointer",
        fontWeight: 600,
        transition: "0.2s ease",
      }}
    >
      {theme === "dark" ? "☀ Light Mode" : "🌙 Dark Mode"}
    </button>
  );
}
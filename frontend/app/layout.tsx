import "./globals.css";
import "../styles/layout.css";
import "@/styles/theme.css";

import ClientLayout from "@/components/ClientLayout";
import { Toaster } from "react-hot-toast";

export const metadata = {
  title: "AttackSurface SOC",
  description: "Enterprise SOC Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="transition-colors duration-300 bg-white text-gray-900 dark:bg-[#0b1220] dark:text-gray-100 min-h-screen">

        <ClientLayout>{children}</ClientLayout>

        {/* GLOBAL SOC ALERT NOTIFICATIONS */}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#0f172a",
              color: "#e5e7eb",
              border: "1px solid #334155",
            },
          }}
        />

      </body>
    </html>
  );
}
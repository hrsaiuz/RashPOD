import type { ReactNode } from "react";
import { AuthProvider } from "./auth/auth-provider";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#F7F8FC", color: "#20243A", fontFamily: "Inter, system-ui, sans-serif" }}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

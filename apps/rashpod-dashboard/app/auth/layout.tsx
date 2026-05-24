import type { ReactNode } from "react";
import { AuthLoginShell } from "./auth-login-shell";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <AuthLoginShell>{children}</AuthLoginShell>;
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { Card, Button } from "@rashpod/ui";
import { api, type SessionUser } from "../../../lib/api";

export default function BusinessSettings() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" }).then((r) => r.json()).then((d) => {
      if (d?.user) { setUser(d.user); setDisplayName(d.user.displayName || ""); }
    });
  }, []);

  const save = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const updated = await api.patch<SessionUser>("/auth/me", { displayName });
      setUser(updated);
      setMsg("Saved");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-brand-ink">Business settings</h1>
      <Card>
        <form onSubmit={save} className="p-1 space-y-4">
          <div>
            <label className="text-sm font-medium text-brand-ink">Company / contact name</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-brand-line px-4 py-2.5 focus:border-brand-blue focus:outline-none" />
          </div>
          <div>
            <label className="text-sm font-medium text-brand-ink">Email</label>
            <input disabled value={user?.email || ""} className="mt-1 w-full rounded-xl border border-brand-line px-4 py-2.5 bg-brand-surface text-brand-muted" />
          </div>
          {msg && <div className="text-sm text-brand-muted">{msg}</div>}
          <Button type="submit" variant="primaryBlue" loading={saving}>Save changes</Button>
        </form>
      </Card>
    </div>
  );
}

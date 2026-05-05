"use client";

import { DashboardPanel, Button } from "@rashpod/ui";
import { UploadCloud, Type, Trash2 } from "lucide-react";

export default function FontLibraryPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-brand-ink mb-1">Font Library</h1>
          <p className="text-brand-muted">Manage custom typography for the storefront per language.</p>
        </div>
      </div>

      <DashboardPanel>
        <div className="p-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-border-soft bg-surface-app text-sm text-brand-muted">
                <th className="px-6 py-4 font-medium">Language</th>
                <th className="px-6 py-4 font-medium">Font Family</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { lang: "English (EN)", font: "Playfair Display", status: "Active" },
                { lang: "Russian (RU)", font: "Lora Cyrillic", status: "Active" },
                { lang: "Uzbek Latin (UZ)", font: "Inter", status: "Active" },
              ].map((row, i) => (
                <tr key={i} className="border-b border-surface-border-soft last:border-0 hover:bg-surface-app/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-brand-ink">{row.lang}</td>
                  <td className="px-6 py-4 text-brand-muted flex items-center gap-2">
                    <Type className="w-4 h-4" /> {row.font}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-semantic-success-bg text-semantic-success-text">
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-brand-blue hover:underline text-sm font-semibold mr-4">Upload New</button>
                    <button className="text-semantic-danger hover:underline text-sm font-semibold">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardPanel>

      <DashboardPanel title="Upload Font">
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-6 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-brand-ink mb-2">Target Language</label>
              <select className="w-full px-4 py-3 rounded-xl border border-surface-border bg-white text-sm focus:outline-none focus:ring-4 focus:ring-focus appearance-none">
                <option>English</option>
                <option>Russian</option>
                <option>Uzbek Latin</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-brand-ink mb-2">Font File (.woff2, .ttf)</label>
              <div className="relative">
                <input type="file" className="hidden" id="font-upload" />
                <label htmlFor="font-upload" className="flex items-center gap-2 w-full px-4 py-3 rounded-xl border border-dashed border-surface-border bg-brand-bg/50 text-sm text-brand-muted cursor-pointer hover:bg-surface-app transition-colors">
                  <UploadCloud className="w-4 h-4" /> Choose file...
                </label>
              </div>
            </div>
            <Button variant="primaryBlue" className="shrink-0 h-[46px]">Upload</Button>
          </div>
        </div>
      </DashboardPanel>
    </div>
  );
}

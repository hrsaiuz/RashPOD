"use client";

import { DashboardPanel, Button } from "@rashpod/ui";
import { UploadCloud, FileImage, Trash2 } from "lucide-react";

export default function MediaLibraryPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-brand-ink mb-1">Media Library</h1>
          <p className="text-brand-muted">Upload decorative background assets and UI illustrations.</p>
        </div>
        <Button variant="primaryBlue" className="gap-2">
          <UploadCloud className="w-4 h-4" /> Upload Asset
        </Button>
      </div>

      <DashboardPanel>
        <div className="p-8">
          <div className="border-2 border-dashed border-surface-border rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-brand-bg/50 mb-8">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
              <UploadCloud className="w-8 h-8 text-brand-blue" />
            </div>
            <h3 className="text-lg font-semibold text-brand-ink mb-1">Click to upload or drag and drop</h3>
            <p className="text-sm text-brand-muted">SVG, PNG, JPG or GIF (max. 5MB)</p>
          </div>

          <h3 className="font-semibold text-brand-ink mb-4">Uploaded Assets</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="group relative aspect-square rounded-xl bg-brand-bg border border-surface-border-soft flex items-center justify-center overflow-hidden">
                <FileImage className="w-8 h-8 text-brand-muted opacity-50" />
                <div className="absolute inset-0 bg-brand-ink/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-semantic-danger shadow-sm hover:scale-105 transition-transform">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardPanel>
    </div>
  );
}

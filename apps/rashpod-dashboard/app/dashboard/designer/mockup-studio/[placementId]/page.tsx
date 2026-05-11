"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Button, Card, ErrorState, Skeleton, StatusBadge } from "@rashpod/ui";
import {
  ArrowLeft,
  Check,
  CircleAlert,
  Download,
  Film,
  Image as ImageIcon,
  Layers,
  RefreshCw,
  Save,
} from "lucide-react";
import { useAuth } from "../../../../auth/auth-provider";
import DashboardLayout from "../../../dashboard-layout";
import { api } from "../../../../../lib/api";

type GeneratedAsset = {
  id: string;
  type: string;
  status: string;
  fileKey?: string | null;
  url?: string | null;
  errorMessage?: string | null;
  createdAt: string;
};

type PrintAreaDto = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  safeX: number;
  safeY: number;
  safeWidth: number;
  safeHeight: number;
  minScale: number;
  maxScale: number;
  allowRotate: boolean;
};

type PlacementDto = {
  id: string;
  designAssetId: string;
  designVersionId: string;
  mockupTemplateId: string;
  printAreaId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  rotation: number;
  approvedByDesigner: boolean;
  approvedAt: string | null;
  templateBgUrl: string | null;
  designUrl: string | null;
  mockupTemplate: {
    id: string;
    name: string;
    baseImageKey: string;
    printAreas: PrintAreaDto[];
    baseProduct?: { id: string; name: string };
  };
  printArea: PrintAreaDto;
  designAsset: { id: string; title: string };
  designVersion: { id: string; widthPx?: number | null; heightPx?: number | null };
  generatedAssets: GeneratedAsset[];
};

const CANVAS_DISPLAY_W = 720;

export default function MockupEditorPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const id = String(params.placementId);

  const [placement, setPlacement] = useState<PlacementDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<string>("");
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const [pos, setPos] = useState({ x: 0, y: 0, w: 0, h: 0, rotation: 0 });
  const [dragging, setDragging] = useState<
    | null
    | { mode: "move" | "resize"; startX: number; startY: number; start: { x: number; y: number; w: number; h: number; rotation: number } }
  >(null);
  const [bgSize, setBgSize] = useState<{ w: number; h: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/auth/login?next=/dashboard/designer/mockup-studio/${id}`);
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, id]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const p = await api.get<PlacementDto>(`/mockup/placements/${id}`);
      setPlacement(p);
      setPos({ x: p.x, y: p.y, w: p.width, h: p.height, rotation: p.rotation || 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load placement");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!placement) return;
    const hasPending = placement.generatedAssets?.some((g) => g.status === "PENDING" || g.status === "RUNNING");
    if (!hasPending) return;
    const t = setInterval(async () => {
      try {
        const p = await api.get<PlacementDto>(`/mockup/placements/${id}`);
        setPlacement(p);
      } catch {
        /* ignore */
      }
    }, 5000);
    return () => clearInterval(t);
  }, [placement, id]);

  const scale = useMemo(() => (bgSize ? CANVAS_DISPLAY_W / bgSize.w : 1), [bgSize]);

  const safeBounds = placement?.printArea;
  const outOfBounds = useMemo(() => {
    if (!safeBounds) return false;
    return (
      pos.x < safeBounds.safeX ||
      pos.y < safeBounds.safeY ||
      pos.x + pos.w > safeBounds.safeX + safeBounds.safeWidth ||
      pos.y + pos.h > safeBounds.safeY + safeBounds.safeHeight
    );
  }, [pos, safeBounds]);

  const dpiWarning = useMemo(() => {
    if (!placement?.designVersion?.widthPx || !pos.w) return null;
    const px = placement.designVersion.widthPx;
    if (px && pos.w > px * 1.05) return "Design is being scaled above source resolution — expect quality loss.";
    return null;
  }, [placement, pos.w]);

  function onPointerDown(e: React.PointerEvent, mode: "move" | "resize") {
    (e.target as Element).setPointerCapture(e.pointerId);
    setDragging({ mode, startX: e.clientX, startY: e.clientY, start: { ...pos } });
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    const dx = (e.clientX - dragging.startX) / scale;
    const dy = (e.clientY - dragging.startY) / scale;
    if (dragging.mode === "move") {
      setPos((p) => ({ ...p, x: Math.round(dragging.start.x + dx), y: Math.round(dragging.start.y + dy) }));
    } else {
      const ratio = dragging.start.h && dragging.start.w ? dragging.start.h / dragging.start.w : 1;
      const newW = Math.max(24, Math.round(dragging.start.w + dx));
      setPos((p) => ({ ...p, w: newW, h: Math.round(newW * ratio) }));
    }
  }
  function onPointerUp() {
    setDragging(null);
  }

  const fitToSafe = useCallback(() => {
    if (!safeBounds) return;
    const aspect =
      placement?.designVersion?.widthPx && placement?.designVersion?.heightPx
        ? placement.designVersion.heightPx / placement.designVersion.widthPx
        : pos.h / Math.max(1, pos.w);
    const w = safeBounds.safeWidth;
    const h = Math.min(safeBounds.safeHeight, Math.round(w * aspect));
    const x = safeBounds.safeX + Math.round((safeBounds.safeWidth - w) / 2);
    const y = safeBounds.safeY + Math.round((safeBounds.safeHeight - h) / 2);
    setPos({ x, y, w, h, rotation: 0 });
  }, [placement, pos.h, pos.w, safeBounds]);

  const centerInSafe = useCallback(() => {
    if (!safeBounds) return;
    const x = safeBounds.safeX + Math.round((safeBounds.safeWidth - pos.w) / 2);
    const y = safeBounds.safeY + Math.round((safeBounds.safeHeight - pos.h) / 2);
    setPos((p) => ({ ...p, x, y }));
  }, [pos.h, pos.w, safeBounds]);

  async function save() {
    if (!placement) return;
    setSaving(true);
    setMessage(null);
    try {
      const scaleVal = placement.designVersion?.widthPx ? pos.w / placement.designVersion.widthPx : 1;
      await api.patch(`/mockup/placements/${placement.id}`, {
        x: pos.x,
        y: pos.y,
        width: pos.w,
        height: pos.h,
        scale: Math.min(Math.max(scaleVal, 0.01), 10),
        rotation: pos.rotation,
      });
      setMessage({ kind: "ok", text: "Placement saved." });
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  async function approve() {
    if (!placement) return;
    setSaving(true);
    setMessage(null);
    try {
      await save();
      await api.post(`/mockup/placements/${placement.id}/approve`);
      await api.post(`/mockup/placements/${placement.id}/generate-listing-images`);
      await load();
      setMessage({ kind: "ok", text: "Approved. Generating listing image pack…" });
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Approve failed" });
    } finally {
      setSaving(false);
    }
  }

  async function generate(kind: "preview" | "listing" | "film" | "production") {
    if (!placement) return;
    setGenerating(kind);
    setMessage(null);
    try {
      const path =
        kind === "preview"
          ? "generate-preview"
          : kind === "listing"
            ? "generate-listing-images"
            : kind === "film"
              ? "generate-film-preview"
              : "generate-production-file";
      await api.post(`/mockup/placements/${placement.id}/${path}`);
      await load();
      setMessage({ kind: "ok", text: `${kind} job enqueued.` });
    } catch (e) {
      setMessage({ kind: "err", text: e instanceof Error ? e.message : "Generate failed" });
    } finally {
      setGenerating("");
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout role="designer">
        <Skeleton className="h-96" />
      </DashboardLayout>
    );
  }

  if (error || !placement) {
    return (
      <DashboardLayout role="designer">
        <ErrorState
          title="Could not load placement"
          description={error || "Placement not found"}
          retry={<Button onClick={load}>Retry</Button>}
        />
      </DashboardLayout>
    );
  }

  const displayH = bgSize ? Math.round(CANVAS_DISPLAY_W * (bgSize.h / bgSize.w)) : 540;

  return (
    <DashboardLayout role="designer">
      <div className="space-y-6">
        <Link
          href="/dashboard/designer/mockup-studio"
          className="inline-flex items-center gap-2 text-sm text-brand-muted hover:text-brand-ink"
        >
          <ArrowLeft size={16} /> Back to studio
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold text-brand-ink">Mockup Editor</h1>
            <p className="text-brand-muted mt-1">
              {placement.designAsset.title} → {placement.mockupTemplate.name}
              {placement.approvedByDesigner && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs font-semibold text-semantic-success">
                  <Check size={14} /> Approved
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={fitToSafe}>Fit to safe zone</Button>
            <Button variant="ghost" size="sm" onClick={centerInSafe}>Center</Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setPos({
                  x: placement.x,
                  y: placement.y,
                  w: placement.width,
                  h: placement.height,
                  rotation: placement.rotation,
                })
              }
            >
              <RefreshCw size={14} /> Reset
            </Button>
            <Button variant="primaryBlue" size="sm" loading={saving} disabled={outOfBounds} onClick={save}>
              <Save size={14} /> Save
            </Button>
            <Button variant="primaryPeach" size="sm" loading={saving} disabled={outOfBounds} onClick={approve}>
              <Check size={14} /> Approve &amp; generate
            </Button>
          </div>
        </div>

        {message && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm border ${
              message.kind === "ok"
                ? "bg-green-50 border-green-200 text-green-900"
                : "bg-red-50 border-red-200 text-red-900"
            }`}
          >
            {message.text}
          </div>
        )}

        {outOfBounds && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-center gap-2">
            <CircleAlert size={16} /> Design extends past the safe zone — drag it back inside before saving.
          </div>
        )}
        {dpiWarning && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-center gap-2">
            <CircleAlert size={16} /> {dpiWarning}
          </div>
        )}

        <Card className="overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-4">
            <div
              ref={canvasRef}
              className="relative mx-auto bg-surface-borderSoft rounded-2xl select-none touch-none"
              style={{ width: CANVAS_DISPLAY_W, height: displayH, maxWidth: "100%" }}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {placement.templateBgUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={placement.templateBgUrl}
                  alt={placement.mockupTemplate.name}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    if (!bgSize) setBgSize({ w: img.naturalWidth, h: img.naturalHeight });
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-brand-muted text-sm">
                  Template background not available
                </div>
              )}

              {bgSize && (
                <div
                  className="absolute border-2 border-red-400/60 pointer-events-none"
                  style={{
                    left: safeBounds!.x * scale,
                    top: safeBounds!.y * scale,
                    width: safeBounds!.width * scale,
                    height: safeBounds!.height * scale,
                  }}
                />
              )}
              {bgSize && (
                <div
                  className="absolute border-2 border-dashed border-brand-blue/70 pointer-events-none"
                  style={{
                    left: safeBounds!.safeX * scale,
                    top: safeBounds!.safeY * scale,
                    width: safeBounds!.safeWidth * scale,
                    height: safeBounds!.safeHeight * scale,
                  }}
                />
              )}

              {bgSize && placement.designUrl && (
                <div
                  className={`absolute cursor-move ${outOfBounds ? "ring-2 ring-red-500" : "ring-1 ring-brand-blue/40"}`}
                  style={{
                    left: pos.x * scale,
                    top: pos.y * scale,
                    width: pos.w * scale,
                    height: pos.h * scale,
                    transform: `rotate(${pos.rotation}deg)`,
                    transformOrigin: "center",
                  }}
                  onPointerDown={(e) => onPointerDown(e, "move")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={placement.designUrl}
                    alt={placement.designAsset.title}
                    className="w-full h-full object-contain pointer-events-none"
                    draggable={false}
                  />
                  <div
                    className="absolute -right-2 -bottom-2 w-4 h-4 bg-brand-blue rounded-sm cursor-nwse-resize"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      onPointerDown(e, "resize");
                    }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-brand-line p-3 text-sm">
                <div className="font-medium text-brand-ink flex items-center gap-2 mb-2">
                  <Layers size={14} className="text-brand-blue" /> Transform
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-brand-muted">
                  <div>X: <span className="text-brand-ink">{pos.x}</span></div>
                  <div>Y: <span className="text-brand-ink">{pos.y}</span></div>
                  <div>W: <span className="text-brand-ink">{pos.w}</span></div>
                  <div>H: <span className="text-brand-ink">{pos.h}</span></div>
                </div>
                {placement.printArea.allowRotate && (
                  <div className="mt-3">
                    <label className="text-xs text-brand-muted">Rotation: {pos.rotation}°</label>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      value={pos.rotation}
                      onChange={(e) => setPos((p) => ({ ...p, rotation: Number(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-brand-line p-3 text-sm">
                <div className="font-medium text-brand-ink mb-2">Generate</div>
                <div className="grid grid-cols-1 gap-2">
                  <Button size="sm" variant="ghost" loading={generating === "preview"} onClick={() => generate("preview")}>
                    <ImageIcon size={14} /> Preview
                  </Button>
                  <Button size="sm" variant="ghost" loading={generating === "listing"} onClick={() => generate("listing")}>
                    <ImageIcon size={14} /> 3-image pack
                  </Button>
                  <Button size="sm" variant="ghost" loading={generating === "film"} onClick={() => generate("film")}>
                    <Film size={14} /> Film preview
                  </Button>
                  <Button size="sm" variant="ghost" loading={generating === "production"} onClick={() => generate("production")}>
                    <Download size={14} /> Production file
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-3 font-semibold text-brand-ink">Generated assets</div>
          {!placement.generatedAssets || placement.generatedAssets.length === 0 ? (
            <p className="text-sm text-brand-muted">No renders yet. Use the Generate panel to enqueue a job.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {placement.generatedAssets.map((g) => (
                <div key={g.id} className="rounded-2xl border border-brand-line overflow-hidden">
                  <div className="aspect-square bg-surface-borderSoft flex items-center justify-center">
                    {g.url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={g.url} alt={g.type} className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-xs text-brand-muted px-2 text-center">{g.status}</span>
                    )}
                  </div>
                  <div className="p-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-brand-ink truncate">{g.type}</span>
                    <StatusBadge status={g.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}

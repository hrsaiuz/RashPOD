"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Button, FormField, Modal, Select } from "@rashpod/ui";

type RightChoice = "UNCHANGED" | "ALLOW" | "DENY";
type FilmChoice = "UNCHANGED" | "ENABLE" | "DISABLE";

interface BulkRightsDraft {
  productSales: RightChoice;
  marketplacePublishing: RightChoice;
  corporateBidding: RightChoice;
  filmSales: FilmChoice;
}

export interface BulkRightsChanges {
  allowProductSales?: boolean;
  allowMarketplacePublishing?: boolean;
  allowCorporateBidding?: boolean;
  filmSalesAction?: "ENABLE" | "DISABLE";
}

interface BulkRightsModalProps {
  open: boolean;
  selectedCount: number;
  saving: boolean;
  error?: string;
  onClose: () => void;
  onApply: (changes: BulkRightsChanges) => void;
}

const INITIAL_DRAFT: BulkRightsDraft = {
  productSales: "UNCHANGED",
  marketplacePublishing: "UNCHANGED",
  corporateBidding: "UNCHANGED",
  filmSales: "UNCHANGED",
};

export function BulkRightsModal({
  open,
  selectedCount,
  saving,
  error,
  onClose,
  onApply,
}: BulkRightsModalProps) {
  const [draft, setDraft] = useState<BulkRightsDraft>(INITIAL_DRAFT);

  useEffect(() => {
    if (open) setDraft(INITIAL_DRAFT);
  }, [open]);

  const changes = useMemo(() => buildChanges(draft), [draft]);
  const hasChanges = Object.keys(changes).length > 0;

  function close() {
    if (!saving) onClose();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title={`Manage rights for ${selectedCount} design${selectedCount === 1 ? "" : "s"}`}
      className="max-w-2xl !overflow-y-auto"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" disabled={saving} onClick={close}>Cancel</Button>
          <Button
            variant={draft.filmSales === "ENABLE" ? "primaryPeach" : "primaryBlue"}
            loading={saving}
            disabled={!hasChanges || selectedCount === 0}
            onClick={() => onApply(changes)}
          >
            Apply to {selectedCount} selected
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-2xl bg-brand-blueLight/35 p-4">
          <ShieldCheck className="mt-0.5 shrink-0 text-brand-blue" size={20} />
          <p className="text-sm leading-6 text-brand-ink">
            Choose only the permissions you want to change. “Leave unchanged” preserves each design&apos;s current setting.
            Product approval never grants film-sale rights automatically.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <RightsChoice
            label="Product sales"
            helperText="Sell the selected designs on RashPOD products."
            value={draft.productSales}
            onChange={(value) => setDraft((current) => ({ ...current, productSales: value }))}
          />
          <RightsChoice
            label="Marketplace publishing"
            helperText="Publish products using these designs to external marketplaces."
            value={draft.marketplacePublishing}
            onChange={(value) => setDraft((current) => ({ ...current, marketplacePublishing: value }))}
          />
          <RightsChoice
            label="Corporate bidding"
            helperText="Offer these designs for corporate work."
            value={draft.corporateBidding}
            onChange={(value) => setDraft((current) => ({ ...current, corporateBidding: value }))}
          />
          <FormField
            label="DTF / UV-DTF film sales"
            helperText="Film consent is recorded separately for every selected design."
          >
            <Select
              value={draft.filmSales}
              onChange={(event) =>
                setDraft((current) => ({ ...current, filmSales: event.target.value as FilmChoice }))
              }
            >
              <option value="UNCHANGED">Leave unchanged</option>
              <option value="ENABLE">Enable — I consent</option>
              <option value="DISABLE">Revoke for future orders</option>
            </Select>
          </FormField>
        </div>

        {draft.filmSales === "ENABLE" ? (
          <div className="flex items-start gap-3 rounded-2xl border border-brand-peach/30 bg-brand-peachLight/45 p-4 text-sm leading-6 text-brand-ink">
            <AlertTriangle className="mt-0.5 shrink-0 text-brand-peach" size={20} />
            <p>
              Applying this action gives your explicit consent for every selected design to be sold as DTF/UV-DTF film.
              Consent is tied to each design&apos;s latest verified version.
            </p>
          </div>
        ) : null}

        {draft.filmSales === "DISABLE" ? (
          <div className="flex items-start gap-3 rounded-2xl border border-semantic-warning/25 bg-semantic-warningBg p-4 text-sm leading-6 text-semantic-warningText">
            <AlertTriangle className="mt-0.5 shrink-0" size={20} />
            <p>
              Future DTF/UV-DTF film orders will stop for the selected designs. Existing paid orders may still be fulfilled.
            </p>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-xl bg-semantic-dangerBg px-4 py-3 text-sm text-semantic-dangerText">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

function RightsChoice({
  label,
  helperText,
  value,
  onChange,
}: {
  label: string;
  helperText: string;
  value: RightChoice;
  onChange: (value: RightChoice) => void;
}) {
  return (
    <FormField label={label} helperText={helperText}>
      <Select value={value} onChange={(event) => onChange(event.target.value as RightChoice)}>
        <option value="UNCHANGED">Leave unchanged</option>
        <option value="ALLOW">Allow</option>
        <option value="DENY">Do not allow</option>
      </Select>
    </FormField>
  );
}

function buildChanges(draft: BulkRightsDraft): BulkRightsChanges {
  return {
    ...(draft.productSales !== "UNCHANGED" ? { allowProductSales: draft.productSales === "ALLOW" } : {}),
    ...(draft.marketplacePublishing !== "UNCHANGED"
      ? { allowMarketplacePublishing: draft.marketplacePublishing === "ALLOW" }
      : {}),
    ...(draft.corporateBidding !== "UNCHANGED"
      ? { allowCorporateBidding: draft.corporateBidding === "ALLOW" }
      : {}),
    ...(draft.filmSales !== "UNCHANGED" ? { filmSalesAction: draft.filmSales } : {}),
  };
}

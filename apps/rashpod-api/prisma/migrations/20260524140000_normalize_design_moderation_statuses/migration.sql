-- Normalize legacy moderation statuses so they appear in the new queue tabs.
UPDATE "DesignAsset" SET status = 'APPROVED_LOCAL' WHERE status = 'APPROVED';
UPDATE "DesignAsset" SET status = 'PENDING_MODERATION' WHERE status = 'NEEDS_FIX';

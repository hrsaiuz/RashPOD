# Local Mockup Pipeline Dev Setup

The Uzbek (LOCAL) mockup pipeline uses real template and design images from storage. In production, templates live in the **public** GCS bucket and designs in the **private** bucket. The worker composites them with Sharp.

## Worker local mode

When GCS is not configured, `rashpod-worker` reads and writes under `worker-artifacts/` (repo root or worker cwd).

Place dev files using the same object keys referenced by admin mockup templates and design versions:

```text
worker-artifacts/
  mockup-templates/local/<product>/front-base.png   # public template
  designs/<design-version-file-key>.png             # private design (also readable without bucket prefix)
```

After moderator approval, outputs appear at:

```text
worker-artifacts/pipeline-mockups/<selectionId>/main.png
worker-artifacts/pipeline-mockups/<selectionId>/lifestyle.png
worker-artifacts/pipeline-mockups/<selectionId>/closeup.png
worker-artifacts/pipeline-mockups/<selectionId>/preview.png
```

## Moderator Konva editor

On `/dashboard/moderator/designs/[id]`, select a local base product, placement preset, mockup template, and print area. The Konva canvas loads signed/public URLs from:

`GET /admin/designs/:id/mockup-editor-context`

Approval submits absolute template-pixel placement (`unit: PX`) that the worker uses for compositing.

## Quick verification

1. Seed admin config (`npm run prisma:seed -w @rashpod/api`).
2. Upload or copy PNG fixtures to `worker-artifacts/` matching seeded `baseImageKey` values and a submitted design `fileKey`.
3. Approve a design on the moderator page with visual placement.
4. Run `npm run dev:worker` and confirm selection reaches `MOCKUP_READY` with PNG outputs under `pipeline-mockups/`.

## Environment variables (production)

| Variable | Purpose |
|---|---|
| `GCS_BUCKET_PRIVATE` | Design originals |
| `GCS_BUCKET_PUBLIC` | Mockup template images |
| `GCS_BUCKET_ASSETS` | Generated mockup outputs |
| `GCP_PROJECT_ID` | GCS access for API + worker |

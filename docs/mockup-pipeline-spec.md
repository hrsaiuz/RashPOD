# RashPOD Mockup Pipeline Technical Spec

## Decision
Use deterministic template-based mockups. Do not use AI-generated product mockups as the commercial source of truth in MVP.

## Stack
| Layer | Tool |
|---|---|
| Frontend canvas editor | React + Konva.js |
| Server image generation | Sharp |
| Storage | Google Cloud Storage |
| Jobs | Cloud Tasks / Pub/Sub / worker |
| Database | PostgreSQL |
| AI assist | OpenAI for copy/tags/explanations |

## Pipeline
```text
Upload design
↓
Validate file
↓
Moderate design
↓
Select product type
↓
Select mockup template
↓
Place design in print area
↓
Save placement
↓
Generate preview
↓
Designer approves
↓
Generate 3 listing images
↓
Create listing
```

## File Validation
Validate file type, size, dimensions, transparency, DPI where available, checksum, and safe filename.

MVP recommended inputs:
```text
PNG with transparent background
SVG
PDF/vector later
PSD later
```

## Product Template Shape
```json
{
  "productType": "T-shirt",
  "templateName": "White T-Shirt Front",
  "baseImage": "gcs://...",
  "printArea": { "x": 420, "y": 310, "width": 360, "height": 280 },
  "safeArea": { "x": 450, "y": 335, "width": 300, "height": 230 },
  "allowedTransforms": { "move": true, "resize": true, "rotate": false },
  "output": { "width": 2000, "height": 2000, "format": "png" }
}
```

## Konva Editor Requirements
- Show mockup image.
- Show print area and optional safe area.
- Show design overlay.
- Drag/resize/rotate when allowed.
- Snap to center.
- Reset placement.
- Zoom controls.
- Fit to viewport.
- Keyboard nudging.

## Placement Constraints
- Design cannot leave print area unless admin enables overflow.
- Scale respects min/max.
- Rotation disabled by default for apparel.
- Safe area visually indicated.

## Placement Data
Save placement as data, not a screenshot.

```json
{
  "designVersionId": "uuid",
  "mockupTemplateId": "uuid",
  "printAreaId": "uuid",
  "x": 455,
  "y": 342,
  "scale": 0.72,
  "rotation": 0,
  "width": 260,
  "height": 180
}
```

## Server Rendering with Sharp
Worker must download base image and design from GCS, apply transforms, composite design onto base image, generate outputs, upload to GCS, and update `GeneratedAsset`.

## Product Listing Image Pack
Each approved product listing requires:
1. Main clean product image.
2. Lifestyle/model/environment mockup.
3. Detail/close-up image.

## Film Preview Pipeline
Film outputs:
- Customer-facing film preview.
- Technical print-size preview.
- Print-ready production file.
- Production ticket.

Validate transparency, dimensions, print size, file format, color/readability, cut/border requirements if needed.

## Corporate Offer Image Pipeline
Corporate requests can reuse generated product previews inside commercial offer PDFs.

## Marketplace Image Package
Future exports may need 1:1, 4:5, white-background, lifestyle, close-up, and marketplace-specific naming.

## Job Statuses
```text
PENDING
PROCESSING
READY
FAILED
```

Failed jobs must store error message, job type, source file IDs, template ID, retry count, timestamp.

## Acceptance Criteria
- Designer can place design inside print area.
- Placement constraints work.
- Server generates exact output using saved placement.
- 3 listing images are generated.
- Film preview is generated only when film sales are enabled.
- Failed jobs can be retried.
- Generated files are stored in GCS.

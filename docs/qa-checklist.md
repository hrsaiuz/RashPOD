# RashPOD QA Checklist

## Designer Upload
- [ ] Designer can register.
- [ ] Designer can verify email.
- [ ] Designer can upload PNG.
- [ ] Invalid file type is rejected.
- [ ] Large file is rejected.
- [ ] Upload stores file in GCS.
- [ ] Design status is correct.

## Moderation
- [ ] Moderator sees submitted designs.
- [ ] Moderator can approve.
- [ ] Moderator can reject with reason.
- [ ] Moderator can request changes.
- [ ] Designer receives email.
- [ ] Action is audit logged.
- [ ] Designer cannot approve own design.

## Commercial Rights
- [ ] Product approval does not enable film sales.
- [ ] Designer can enable film sales for own design.
- [ ] Designer can disable future film sales.
- [ ] Consent timestamp is stored.
- [ ] Revocation timestamp is stored.
- [ ] Admin override is audit logged.

## Mockup Studio
- [ ] Product type selector works.
- [ ] Mockup template selector works.
- [ ] Print area displays.
- [ ] Safe area displays.
- [ ] Design drag works.
- [ ] Resize works.
- [ ] Design cannot leave allowed print area.
- [ ] Reset/center works.
- [ ] Placement saves.

## Asset Generation
- [ ] Worker receives job.
- [ ] Worker downloads from GCS.
- [ ] Sharp renders main image.
- [ ] Sharp renders lifestyle image.
- [ ] Sharp renders close-up image.
- [ ] Outputs upload to GCS.
- [ ] Status updates to READY.
- [ ] Failed jobs store error and retry.

## Listings
- [ ] Listing created from approved mockup.
- [ ] Listing has 3 images.
- [ ] Listing can publish.
- [ ] Listing appears in shop.
- [ ] Product detail loads.
- [ ] Designer attribution appears.

## Film Listings
- [ ] Film listing requires consent.
- [ ] DTF selection works.
- [ ] UV-DTF selection works.
- [ ] Size/quantity works.
- [ ] Price calculation works.
- [ ] Film preview generates.
- [ ] Production file is private.
- [ ] Film order creates production job.

## Payments / Click
- [ ] Checkout creates pending order.
- [ ] Click payment session created.
- [ ] Success webhook verified.
- [ ] Failure handled.
- [ ] Webhook is idempotent.
- [ ] Order status updates only after verified payment.

## Delivery
- [ ] Tashkent option appears.
- [ ] Nationwide option appears.
- [ ] Pickup option appears.
- [ ] Delivery fee calculated/configured.
- [ ] Delivery method appears on production job.
- [ ] Admin override works.

## Production
- [ ] Paid product order creates job.
- [ ] Paid film order creates job.
- [ ] Staff updates status.
- [ ] Status logs stored.
- [ ] QC checklist available.
- [ ] Customer receives status email.

## Corporate
- [ ] Corporate request can be submitted.
- [ ] Designer can bid.
- [ ] Admin can select bid.
- [ ] Admin can add offer line items.
- [ ] PDF offer generated.
- [ ] Offer sent by ZeptoMail.
- [ ] Client accepts/rejects.
- [ ] Accepted offer converts to job.

## Admin Configuration
- [ ] Product type CRUD works.
- [ ] Base product CRUD works.
- [ ] Mockup template CRUD works.
- [ ] Print area setup works.
- [ ] Royalty rules work.
- [ ] Film-sale rules work.
- [ ] Delivery settings work.
- [ ] Email templates work.
- [ ] Admin changes audit logged.

## AI
- [ ] Listing title generated.
- [ ] Description generated.
- [ ] Tags generated.
- [ ] Translation works.
- [ ] Moderation assist returns hints only.
- [ ] AI output requires human approval.
- [ ] AI usage logged.

## UI
- [ ] Palette preserved.
- [ ] Pill buttons.
- [ ] Rounded soft-shadow cards.
- [ ] Product cards match identity.
- [ ] Decorative assets used lightly.
- [ ] Framer hover/tap works.
- [ ] Reduced motion respected.

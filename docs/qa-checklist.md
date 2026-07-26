# RashPOD QA Checklist

## Designer Signup and Activation
- [ ] Every storefront "sell/start designing" CTA opens the designer application.
- [ ] The application requires profile details, portfolio, identity evidence, selfie, and all agreements.
- [ ] Anonymous uploads reject unsupported purposes, types, and sizes.
- [ ] Duplicate active applications for the same email are rejected.
- [ ] Admin reviewers can open private evidence through short-lived signed URLs.
- [ ] Rejecting requires a review reason and queues applicant feedback.
- [ ] Approving creates one activation invitation and is audit logged.
- [ ] Invitation acceptance creates or activates a verified designer account.
- [ ] Pending, inactive, suspended, and unverified designers cannot sign in or use an existing JWT.
- [ ] A designer invitation cannot overwrite a staff role.
- [ ] Customer and corporate registration preserve the selected role.

## Designer Upload
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

## Super Admin Governance
- [ ] Critical recovery permissions cannot remove `SUPER_ADMIN`.
- [ ] A super admin cannot demote their own account.
- [ ] The final super admin cannot be demoted through any role endpoint.
- [ ] Tenant results paginate with an explicit total.
- [ ] Tenant create/edit/suspend/reactivate flows work and are audit logged.
- [ ] Tenant plan assignment is atomic and requires confirmation.
- [ ] Plan create/edit/status changes require confirmation.
- [ ] Secret reference mutations never expose or store raw credentials.
- [ ] Audit logs support filtering, pagination, and event detail.
- [ ] Mutation success and failure feedback is announced to assistive technology.
- [ ] Super admin drawers and confirmation dialogs trap and restore keyboard focus.

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

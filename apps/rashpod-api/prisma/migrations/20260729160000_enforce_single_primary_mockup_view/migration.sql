-- Application transactions promote one view at a time. This partial unique
-- index also protects the invariant when concurrent admin requests race.
-- A template's active flag gates availability; its primary view remains a
-- valid configuration target even while the parent template is inactive.
UPDATE "MockupView"
SET "isActive" = true
WHERE "isPrimary" = true
  AND "isActive" = false;

CREATE UNIQUE INDEX "MockupView_one_primary_per_template"
ON "MockupView" ("mockupTemplateId")
WHERE "isPrimary" = true;

CREATE TABLE "StoryEngagement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "designStoryId" TEXT NOT NULL,
    "liked" BOOLEAN NOT NULL DEFAULT false,
    "bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryEngagement_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoryEngagement_userId_designStoryId_key" ON "StoryEngagement"("userId", "designStoryId");
CREATE INDEX "StoryEngagement_userId_bookmarked_updatedAt_idx" ON "StoryEngagement"("userId", "bookmarked", "updatedAt");
CREATE INDEX "StoryEngagement_designStoryId_idx" ON "StoryEngagement"("designStoryId");

ALTER TABLE "StoryEngagement" ADD CONSTRAINT "StoryEngagement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoryEngagement" ADD CONSTRAINT "StoryEngagement_designStoryId_fkey" FOREIGN KEY ("designStoryId") REFERENCES "DesignStory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

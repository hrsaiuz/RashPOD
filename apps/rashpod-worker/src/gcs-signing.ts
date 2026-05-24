function firstPresent(...values: Array<string | undefined>) {
  return values.find((value) => value && value.trim().length > 0)?.trim();
}

export async function createSignedReadUrl(objectKey: string, expiresSeconds = 3600): Promise<string> {
  const projectId = firstPresent(process.env.GCP_PROJECT_ID, process.env.GCS_PROJECT_ID, process.env.GOOGLE_CLOUD_PROJECT, process.env.GCLOUD_PROJECT);
  const bucketName = firstPresent(process.env.GCS_BUCKET_PRIVATE, process.env.GCS_BUCKET_ASSETS, process.env.GCS_BUCKET_NAME, "rashpod-assets-private");
  if (projectId && bucketName) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Storage } = require("@google-cloud/storage");
    const storage = new Storage({ projectId });
    const [url] = await storage.bucket(bucketName).file(objectKey.replace(/\\/g, "/")).getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + expiresSeconds * 1000,
    });
    return url;
  }
  return `https://storage.local/read/${encodeURIComponent(objectKey)}?exp=${expiresSeconds}`;
}

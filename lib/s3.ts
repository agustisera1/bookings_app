import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { normalizeListingPhoto } from "@/lib/images";

export const s3 = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * Deletes a listing photo from S3 given its public URL. The object key is the
 * URL pathname (e.g. `listings/<id>/<uuid>.jpeg`), so we don't need to know the
 * bucket/region layout here — it's whatever the upload route wrote.
 */
export async function deleteListingObject(url: string) {
  const Bucket = process.env.AWS_LISTINGS_BUCKET;
  const Key = decodeURIComponent(new URL(url).pathname).replace(/^\//, "");

  await s3.send(new DeleteObjectCommand({ Bucket, Key }));
}

export async function addListingObject(
  file: File,
  listingId: string,
): Promise<string | null> {
  try {
    const Bucket = process.env.AWS_LISTINGS_BUCKET;
    const region = process.env.AWS_S3_REGION;
    const randId = crypto.randomUUID();
    const { body, contentType, extension } = await normalizeListingPhoto(file);
    const Key = `listings/${listingId}/${randId}.${extension}`;

    const insertCmd = new PutObjectCommand({
      Bucket,
      Key,
      Body: body,
      ContentType: contentType,
      // The key carries a UUID, so an object is never rewritten under the same
      // URL: it can be cached permanently by the optimizer and the browser.
      CacheControl: "public, max-age=31536000, immutable",
    });

    await s3.send(insertCmd);
    return `https://${Bucket}.s3.${region}.amazonaws.com/${Key}`;
  } catch (error) {
    console.error("[addListingObject]", error);
    return null;
  }
}

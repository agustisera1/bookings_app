import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { MIME_TYPES, ValidMimeType } from "@/lib/utils";

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
    const type = MIME_TYPES[file.type as ValidMimeType];
    const Key = `listings/${listingId}/${randId}.${type}`;
    const Body = Buffer.from(await file.arrayBuffer());

    const insertCmd = new PutObjectCommand({
      Bucket,
      Key,
      Body,
      ContentType: file.type,
    });

    await s3.send(insertCmd);
    return `https://${Bucket}.s3.${region}.amazonaws.com/${Key}`;
  } catch {
    return null;
  }
}

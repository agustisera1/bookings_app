import sharp from "sharp";

const MAX_DIMENSION = 2560;
const WEBP_QUALITY = 82;

export type NormalizedPhoto = {
  body: Buffer;
  contentType: string;
  extension: string;
};

/**
 * Turns an uploaded photo into the single web-ready object we store in S3.
 *
 * This targets the *origin*, not what the browser gets: `next/image` pulls the
 * full original from S3 on every cache miss, so shrinking what we store is what
 * makes a miss cheap. The per-viewport ladder is still the optimizer's job.
 */
export async function normalizeListingPhoto(
  file: File,
): Promise<NormalizedPhoto> {
  const input = Buffer.from(await file.arrayBuffer());

  // `rotate()` with no args applies the EXIF orientation flag, and has to run
  // before the encode drops all metadata — otherwise phone photos that leaned
  // on that flag come out sideways. Dropping the rest also sheds the GPS tags.
  const body = await sharp(input)
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return { body, contentType: "image/webp", extension: "webp" };
}

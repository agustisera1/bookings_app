import { addListingPhoto } from "@/lib/services/listings";
import { toHttpResponse } from "@/lib/http";
import type { ServiceResult } from "@/lib/types";
import { NextRequest } from "next/server";

const failed: ServiceResult<string> = {
  ok: false,
  error: "Could not upload image for listing",
  code: "UNEXPECTED",
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const listingId = formData.get("listingId");

    if (!(file instanceof File) || typeof listingId !== "string" || !listingId)
      return toHttpResponse({
        ok: false,
        error: "A photo and a listing are required",
        code: "VALIDATION",
      });

    return toHttpResponse(await addListingPhoto(listingId, file));
  } catch (error) {
    console.error("[POST /api/s3]", error);
    return toHttpResponse(failed);
  }
}

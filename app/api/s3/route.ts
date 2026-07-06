import { addListingObject } from "@/lib/s3";
import { NextRequest, NextResponse } from "next/server";

const error = {
  code: 500,
  error: "Could not upload image for listing",
  ok: false,
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const url = await addListingObject(
      formData.get("file") as File,
      formData.get("listingId") as string,
    );

    if (!url) return NextResponse.json(error);
    return NextResponse.json({
      data: url,
      ok: true,
      code: 201,
    });
  } catch {
    return NextResponse.json(error);
  }
}

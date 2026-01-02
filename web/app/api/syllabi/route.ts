import { zoteroAPIClient } from "@/app/lib/zotero";
import { NextResponse } from "next/server";

// To handle a GET request to /api
export async function GET() {
  // Do whatever you want
  const settings = await zoteroAPIClient
    .settings("extensions.zotero.syllabus.collectionMetadata")
    .get();
  return NextResponse.json({ settings }, { status: 200 });
}

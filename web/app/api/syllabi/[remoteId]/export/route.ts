import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import config from "@payload-config";

type Params = Promise<{ remoteId: string }>;

export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    const { remoteId } = await params;

    if (!remoteId) {
      return NextResponse.json(
        { error: "remoteId is required" },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });

    // Find syllabus by remoteId
    const syllabi = await payload.find({
      collection: "syllabi",
      where: {
        remoteId: { equals: decodeURIComponent(remoteId) },
      },
      limit: 1,
    });

    if (syllabi.docs.length === 0) {
      return NextResponse.json(
        { error: "Syllabus not found" },
        { status: 404 }
      );
    }

    const syllabus = syllabi.docs[0];

    // Return the raw syllabusData JSON
    return NextResponse.json(syllabus.syllabusData, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    );
  }
}


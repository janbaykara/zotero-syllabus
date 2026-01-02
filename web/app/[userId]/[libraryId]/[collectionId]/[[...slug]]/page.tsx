import { getPayload } from "payload";
import config from "@payload-config";
import { notFound } from "next/navigation";
import { SyllabusViewer } from "@/app/components/SyllabusViewer";
import { SyllabusDetailClient } from "./SyllabusDetailClient";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

type PageParams = Promise<{
  userId: string;
  libraryId: string;
  collectionId: string;
  slug?: string[];
}>;

interface PageProps {
  params: PageParams;
}

async function getSyllabus(userId: string, libraryId: string, collectionId: string) {
  try {
    const remoteId = `${userId}:${libraryId}:${collectionId}`;
    const payload = await getPayload({ config });

    const syllabi = await payload.find({
      collection: "syllabi",
      where: {
        remoteId: { equals: remoteId },
      },
      limit: 1,
    });

    if (syllabi.docs.length === 0) {
      return null;
    }

    return syllabi.docs[0];
  } catch (error) {
    console.error("Error fetching syllabus:", error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId, libraryId, collectionId } = await params;
  const syllabus = await getSyllabus(userId, libraryId, collectionId);

  if (!syllabus) {
    return {
      title: "Syllabus Not Found",
    };
  }

  const syllabusData = syllabus.syllabusData;

  return {
    title: `${syllabus.title} | Zotero Syllabus`,
    description: syllabus.description || syllabusData?.description || `Course syllabus: ${syllabus.title}`,
    openGraph: {
      title: syllabus.title,
      description: syllabus.description || syllabusData?.description,
      type: "article",
    },
  };
}

export default async function SyllabusPage({ params }: PageProps) {
  const { userId, libraryId, collectionId } = await params;
  const syllabus = await getSyllabus(userId, libraryId, collectionId);

  if (!syllabus) {
    notFound();
  }

  const syllabusData = syllabus.syllabusData;
  const remoteId = syllabus.remoteId;
  const exportUrl = `${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/syllabi/${encodeURIComponent(remoteId)}/export`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-quaternary">
        <div className="container-wide py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-secondary hover:text-primary transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Library
            </Link>
            <SyllabusDetailClient
              title={syllabus.title}
              exportUrl={exportUrl}
            />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container-wide py-8 md:py-12">
        <SyllabusViewer
          data={syllabusData}
          institution={syllabus.institution || undefined}
          moduleNumber={syllabus.moduleNumber || undefined}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-quaternary mt-12">
        <div className="container-wide py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-secondary">
            <p>
              Shared via{" "}
              <Link href="/" className="text-accent-blue hover:underline">
                Zotero Syllabus Public Library
              </Link>
            </p>
            <a
              href="https://github.com/janbaykara/zotero-syllabus/releases/latest/download/zotero-syllabus.xpi"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-accent-blue hover:underline"
            >
              <Download size={14} />
              Get the Plugin
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}


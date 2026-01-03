import { getPayload } from "payload";
import config from "@payload-config";
import { SyllabusGallery } from "./components/SyllabusGallery";
import { Download, BookOpen, Share2, Users, ArrowRight } from "lucide-react";
import Link from "next/link";

async function getRecentSyllabi() {
  try {
    const payload = await getPayload({ config });
    const syllabi = await payload.find({
      collection: "syllabi",
      where: {
        publishedAt: { exists: true },
      },
      sort: "-updatedAt",
      limit: 12,
    });
    return syllabi.docs;
  } catch (error) {
    console.error("Error fetching syllabi:", error);
    return [];
  }
}

export default async function Home() {
  const syllabi = await getRecentSyllabi();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent-blue10 via-background to-accent-green/5" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(64,114,229,0.1),transparent_50%)]" />

        <div className="relative container-wide py-20 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-blue10 text-accent-blue text-sm font-medium mb-6">
              <BookOpen size={16} />
              Open Academic Resources
            </div>

            <h1 className="text-4xl md:text-6xl font-bold text-primary mb-6 tracking-tight">
              Zotero Syllabus
              <span className="block text-accent-blue">Public Library</span>
            </h1>

            <p className="text-xl text-secondary mb-8 leading-relaxed">
              Share your course syllabi with the academic community. Discover reading lists
              from educators worldwide. Import syllabi directly into your Zotero library.
            </p>

            <div className="flex flex-wrap gap-4">
              <a
                href="https://github.com/janbaykara/zotero-syllabus/releases/latest/download/zotero-syllabus.xpi"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent-blue text-white font-medium hover:bg-accent-blue/90 transition-colors"
              >
                <Download size={20} />
                Download Plugin
              </a>
              <Link
                href="#gallery"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-quaternary text-primary font-medium hover:bg-quinary transition-colors"
              >
                Browse Syllabi
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="border-y border-quaternary bg-quinary/30">
        <div className="container-wide py-16">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-accent-blue10 text-accent-blue mb-4">
                <Share2 size={24} />
              </div>
              <h3 className="text-lg font-semibold text-primary mb-2">
                Share Your Syllabi
              </h3>
              <p className="text-secondary">
                Upload your course reading lists to the public library with one click
                from the Zotero Syllabus plugin.
              </p>
            </div>

            <div className="text-center md:text-left">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-accent-green/10 text-accent-green mb-4">
                <BookOpen size={24} />
              </div>
              <h3 className="text-lg font-semibold text-primary mb-2">
                Discover Reading Lists
              </h3>
              <p className="text-secondary">
                Browse syllabi from educators worldwide. Find inspiration for your
                courses or explore new fields.
              </p>
            </div>

            <div className="text-center md:text-left">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-accent-orange/10 text-accent-orange mb-4">
                <Users size={24} />
              </div>
              <h3 className="text-lg font-semibold text-primary mb-2">
                Import to Zotero
              </h3>
              <p className="text-secondary">
                Found a great syllabus? Import it directly into your Zotero library
                complete with all bibliographic data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Gallery Section */}
      <section id="gallery" className="container-wide py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-primary mb-2">
              Recently Shared Syllabi
            </h2>
            <p className="text-secondary">
              Explore the latest course reading lists shared by educators
            </p>
          </div>
        </div>

        <SyllabusGallery syllabi={syllabi} />
      </section>

      {/* CTA Section */}
      <section className="border-t border-quaternary bg-gradient-to-b from-quinary/50 to-background">
        <div className="container-wide py-16 text-center">
          <h2 className="text-2xl font-bold text-primary mb-4">
            Ready to share your syllabus?
          </h2>
          <p className="text-secondary mb-8 max-w-xl mx-auto">
            Download the Zotero Syllabus plugin to organize your reading lists
            and share them with the academic community.
          </p>
          <a
            href="https://github.com/janbaykara/zotero-syllabus/releases/latest/download/zotero-syllabus.xpi"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-accent-blue text-white font-medium hover:bg-accent-blue/90 transition-colors"
          >
            <Download size={20} />
            Get the Plugin
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-quaternary">
        <div className="container-wide py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-secondary">
            <p>
              Zotero Syllabus is an open-source project by{" "}
              <a
                href="https://janbaykara.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-blue hover:underline"
              >
                Jan Baykara
              </a>
            </p>
            <div className="flex items-center gap-6">
              <a
                href="https://github.com/janbaykara/zotero-syllabus"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                GitHub
              </a>
              <a
                href="https://github.com/janbaykara/zotero-syllabus/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                Report an Issue
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Download, Share2 } from "lucide-react";
import { ImportModal } from "@/app/components/ImportModal";

interface SyllabusDetailClientProps {
  title: string;
  exportUrl: string;
}

export function SyllabusDetailClient({
  title,
  exportUrl,
}: SyllabusDetailClientProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-blue text-white font-medium hover:bg-accent-blue/90 transition-colors"
      >
        <Download size={18} />
        Get this Syllabus
      </button>

      <ImportModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        exportUrl={exportUrl}
        title={title}
      />
    </>
  );
}


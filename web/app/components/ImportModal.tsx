"use client";

import { useState } from "react";
import { X, Download, Copy, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportUrl: string;
  title: string;
}

export function ImportModal({
  isOpen,
  onClose,
  exportUrl,
  title,
}: ImportModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-background rounded-xl shadow-[var(--box-shadow-level-4)] max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-quaternary">
          <h2 className="text-xl font-semibold text-primary">
            Get this Syllabus
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-quinary text-secondary hover:text-primary transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <p className="text-secondary">
            Import <strong className="text-primary">{title}</strong> into your
            Zotero library using the Zotero Syllabus plugin.
          </p>

          {/* Steps */}
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="shrink-0 w-8 h-8 rounded-full bg-accent-blue10 text-accent-blue flex items-center justify-center font-semibold text-sm">
                1
              </div>
              <div>
                <p className="font-medium text-primary">Download the plugin</p>
                <p className="text-sm text-secondary mt-1">
                  If you haven&apos;t already, install the Zotero Syllabus plugin.
                </p>
                <a
                  href="https://github.com/janbaykara/zotero-syllabus/releases/latest/download/zotero-syllabus.xpi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-2 text-sm text-accent-blue hover:underline"
                >
                  <Download size={14} />
                  Download Plugin
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="shrink-0 w-8 h-8 rounded-full bg-accent-blue10 text-accent-blue flex items-center justify-center font-semibold text-sm">
                2
              </div>
              <div>
                <p className="font-medium text-primary">
                  Open a collection in Zotero
                </p>
                <p className="text-sm text-secondary mt-1">
                  Create a new collection or open an existing one where you want
                  to import the syllabus.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="shrink-0 w-8 h-8 rounded-full bg-accent-blue10 text-accent-blue flex items-center justify-center font-semibold text-sm">
                3
              </div>
              <div>
                <p className="font-medium text-primary">
                  Switch to Syllabus view
                </p>
                <p className="text-sm text-secondary mt-1">
                  Click the Syllabus view button in the collection toolbar.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="shrink-0 w-8 h-8 rounded-full bg-accent-blue10 text-accent-blue flex items-center justify-center font-semibold text-sm">
                4
              </div>
              <div>
                <p className="font-medium text-primary">Import from URL</p>
                <p className="text-sm text-secondary mt-1">
                  Go to Settings → Cloud Sync, paste the export URL below, and
                  click Import.
                </p>
              </div>
            </div>
          </div>

          {/* Export URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary">
              Export URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={exportUrl}
                readOnly
                className="flex-1 px-4 py-2 rounded-lg border border-quaternary bg-quinary text-primary text-sm font-mono"
              />
              <button
                onClick={handleCopy}
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-2",
                  copied
                    ? "bg-accent-green text-white"
                    : "bg-accent-blue text-white hover:bg-accent-blue/90"
                )}
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 rounded-lg border border-quaternary text-primary font-medium hover:bg-quinary transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


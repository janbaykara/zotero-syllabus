"use client";

import { useState } from "react";
import { SyllabusCard } from "./SyllabusCard";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Syllabus {
  id: string | number;
  remoteId?: string;
  title?: string;
  description?: string;
  institution?: string;
  moduleNumber?: string;
  syllabusData?: {
    classes?: Record<string, unknown>;
  } | null;
  updatedAt?: string;
  zoteroUserId?: string;
  libraryId?: string;
  collectionId?: string;
}

interface SyllabusGalleryProps {
  syllabi: Syllabus[];
  showSearch?: boolean;
}

export function SyllabusGallery({
  syllabi,
  showSearch = true,
}: SyllabusGalleryProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSyllabi = syllabi.filter((syllabus) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      syllabus.title?.toLowerCase().includes(query) ||
      syllabus.description?.toLowerCase().includes(query) ||
      syllabus.institution?.toLowerCase().includes(query) ||
      syllabus.moduleNumber?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {showSearch && (
        <div className="relative">
          <Search
            size={20}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-tertiary"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search syllabi by title, institution, or module..."
            className={cn(
              "w-full pl-12 pr-12 py-3 rounded-lg",
              "border border-quaternary bg-background text-primary",
              "placeholder:text-tertiary",
              "focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-transparent",
              "transition-all"
            )}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-tertiary hover:text-primary"
            >
              <X size={20} />
            </button>
          )}
        </div>
      )}

      {filteredSyllabi.length === 0 ? (
        <div className="text-center py-12 text-secondary">
          {searchQuery ? (
            <p>No syllabi found matching &quot;{searchQuery}&quot;</p>
          ) : (
            <p>No syllabi available yet. Be the first to share one!</p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSyllabi.map((syllabus) => (
            <SyllabusCard
              key={syllabus.id}
              id={syllabus.id}
              title={syllabus.title || "Untitled Syllabus"}
              description={syllabus.description}
              institution={syllabus.institution}
              moduleNumber={syllabus.moduleNumber}
              classCount={
                syllabus.syllabusData?.classes
                  ? Object.keys(syllabus.syllabusData.classes).length
                  : 0
              }
              updatedAt={syllabus.updatedAt}
              zoteroUserId={syllabus.zoteroUserId}
              libraryId={syllabus.libraryId}
              collectionId={syllabus.collectionId}
            />
          ))}
        </div>
      )}
    </div>
  );
}


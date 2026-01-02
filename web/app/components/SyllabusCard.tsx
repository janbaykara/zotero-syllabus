"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { BookOpen, Building2, Hash, Calendar, Users } from "lucide-react";

interface SyllabusCardProps {
  id: string;
  remoteId: string;
  title: string;
  description?: string;
  institution?: string;
  moduleNumber?: string;
  classCount?: number;
  updatedAt?: string;
  zoteroUserId?: string;
  libraryId?: string;
  collectionId?: string;
}

export function SyllabusCard({
  remoteId,
  title,
  description,
  institution,
  moduleNumber,
  classCount = 0,
  updatedAt,
  zoteroUserId,
  libraryId,
  collectionId,
}: SyllabusCardProps) {
  // Build the URL
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const href = `/${zoteroUserId}/${libraryId}/${collectionId}/${slug}`;

  return (
    <Link
      href={href}
      className={cn(
        "block p-6 rounded-xl border border-quaternary bg-background",
        "hover:shadow-[var(--box-shadow-card-hover)] hover:border-tertiary",
        "transition-all duration-200",
        "group"
      )}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-lg font-semibold text-primary group-hover:text-accent-blue transition-colors line-clamp-2">
            {title}
          </h3>
          {classCount > 0 && (
            <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-blue10 text-accent-blue text-sm font-medium">
              <BookOpen size={14} />
              {classCount}
            </span>
          )}
        </div>

        {/* Description */}
        {description && (
          <p className="text-secondary text-sm line-clamp-2">{description}</p>
        )}

        {/* Metadata */}
        <div className="flex flex-wrap gap-3 text-sm text-tertiary">
          {institution && (
            <span className="inline-flex items-center gap-1">
              <Building2 size={14} />
              {institution}
            </span>
          )}
          {moduleNumber && (
            <span className="inline-flex items-center gap-1">
              <Hash size={14} />
              {moduleNumber}
            </span>
          )}
          {updatedAt && (
            <span className="inline-flex items-center gap-1">
              <Calendar size={14} />
              {new Date(updatedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}


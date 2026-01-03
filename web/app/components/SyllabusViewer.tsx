"use client";

import { BookOpen, Building2, Hash, Calendar, FileText } from "lucide-react";

interface ClassMetadata {
  title?: string;
  description?: string;
  readingDate?: string;
}

interface SyllabusData {
  collectionTitle: string;
  description?: string;
  classes?: Record<string, ClassMetadata>;
  nomenclature?: string;
  priorities?: Array<{
    id: string;
    name: string;
    color: string;
    order: number;
  }>;
  institution?: string;
  moduleNumber?: string;
  rdf?: string;
}

interface SyllabusViewerProps {
  data: SyllabusData;
  institution?: string;
  moduleNumber?: string;
}

export function SyllabusViewer({
  data,
  institution,
  moduleNumber,
}: SyllabusViewerProps) {
  const {
    collectionTitle,
    description,
    classes = {},
    nomenclature = "class",
  } = data;

  // Sort classes by number
  const sortedClasses = Object.entries(classes).sort(([a], [b]) => {
    const numA = parseInt(a);
    const numB = parseInt(b);
    if (isNaN(numA) && isNaN(numB)) return a.localeCompare(b);
    if (isNaN(numA)) return 1;
    if (isNaN(numB)) return -1;
    return numA - numB;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold text-primary">
          {collectionTitle}
        </h1>

        {/* Metadata */}
        <div className="flex flex-wrap gap-4 text-secondary">
          {(institution || data.institution) && (
            <span className="inline-flex items-center gap-2">
              <Building2 size={18} />
              {institution || data.institution}
            </span>
          )}
          {(moduleNumber || data.moduleNumber) && (
            <span className="inline-flex items-center gap-2">
              <Hash size={18} />
              {moduleNumber || data.moduleNumber}
            </span>
          )}
          {sortedClasses.length > 0 && (
            <span className="inline-flex items-center gap-2">
              <BookOpen size={18} />
              {sortedClasses.length} {sortedClasses.length === 1 ? nomenclature : nomenclature + "es"}
            </span>
          )}
        </div>

        {description && (
          <p className="text-lg text-secondary leading-relaxed">{description}</p>
        )}
      </header>

      {/* Classes */}
      <div className="space-y-8">
        {sortedClasses.map(([classNumber, classData]) => (
          <ClassSection
            key={classNumber}
            number={classNumber}
            data={classData}
            nomenclature={nomenclature}
          />
        ))}
      </div>

      {sortedClasses.length === 0 && (
        <div className="text-center py-12 text-secondary">
          <FileText size={48} className="mx-auto mb-4 opacity-50" />
          <p>This syllabus doesn&apos;t have any classes yet.</p>
        </div>
      )}
    </div>
  );
}

interface ClassSectionProps {
  number: string;
  data: ClassMetadata;
  nomenclature: string;
}

function ClassSection({ number, data, nomenclature }: ClassSectionProps) {
  const { title, description, readingDate } = data;
  const capitalizedNomenclature =
    nomenclature.charAt(0).toUpperCase() + nomenclature.slice(1);

  return (
    <section className="border-l-4 border-accent-blue pl-6">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-baseline gap-3">
          <span className="text-sm font-semibold uppercase text-secondary tracking-wider">
            {capitalizedNomenclature} {number}
          </span>
          {readingDate && (
            <span className="inline-flex items-center gap-1 text-sm text-tertiary">
              <Calendar size={14} />
              {new Date(readingDate).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
        </div>

        {title && (
          <h2 className="text-xl font-semibold text-primary">{title}</h2>
        )}

        {description && (
          <p className="text-secondary leading-relaxed">{description}</p>
        )}
      </div>
    </section>
  );
}


// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h, Fragment } from "preact";
import { useState, useEffect } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import {
  generateFallbackBibliographicReference,
  generateBibliographicReference,
} from "../utils/cite";

export function Bibliography({
  items,
  compactMode = false,
  cslStyle = null,
}: {
  items: Zotero.Item[];
  compactMode?: boolean;
  cslStyle?: string | null;
}) {
  const [bibliographicReference, setBibliographicReference] = useState(
    generateFallbackBibliographicReference(items),
  );
  useEffect(() => {
    (async () => {
      const ref = await generateBibliographicReference(items, false, cslStyle);
      if (ref) {
        setBibliographicReference(ref);
      }
    })();
  }, [items, cslStyle]);

  return (
    <div>
      <header className="syllabus-bibliography">
        <div
          className={twMerge(
            "font-semibold mt-12 mb-4",
            compactMode ? "text-xl" : "text-2xl",
          )}
        >
          Bibliography
        </div>
      </header>
      <div className={twMerge("flex flex-col gap-3")}>
        {bibliographicReference.split("\n").map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { h } from "preact";
import { Upload } from "lucide-preact";
import { getString } from "../utils/locale";

export function OsFileDropOverlay({ visible }: { visible: boolean }) {
  if (!visible) {
    return null;
  }
  return (
    <div className="sticky h-full inset-0 z-50 bg-accent-blue/10 backdrop-blur-sm flex items-center justify-center pointer-events-none in-[.print]:hidden">
      <div className="bg-background border-4 border-dashed border-accent-blue rounded-lg p-8 shadow-lg">
        <div className="flex flex-col items-center gap-4">
          <Upload size={48} className="text-accent-blue" />
          <div className="text-xl font-semibold text-accent-blue">
            {getString("page-drop-import-file")}
          </div>
        </div>
      </div>
    </div>
  );
}

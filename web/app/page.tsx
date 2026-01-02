"use client";

import Image from "next/image";
import { useSyllabi } from "./data/useSyllabi";

export default function Home() {
  const syllabusCollections = useSyllabi();
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {JSON.stringify(syllabusCollections, null, 2)}
      </pre>
    </div>
  );
}

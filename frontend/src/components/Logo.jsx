import { useState } from "react";

export default function Logo({ height = 36, className = "" }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className={`flex items-center gap-2 text-lg font-bold ${className}`}>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-digi-gradient text-white">
          D
        </span>
        <span>
          Digitelio <span className="text-gradient">AI</span>
        </span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center ${className}`}>
      <img
        src="/logo-clair.png"
        alt="Digitelio AI"
        style={{ height }}
        className="block w-auto dark:hidden"
        onError={() => setFailed(true)}
      />
      <img
        src="/logo-sombre.png"
        alt="Digitelio AI"
        style={{ height }}
        className="hidden w-auto dark:block"
        onError={() => setFailed(true)}
      />
    </span>
  );
      }

"use client";

import React from "react";
import { Circle } from "lucide-react";

interface StatusBarProps {
  mode: string;
  language: string;
  cursorLine: number;
  cursorCol: number;
  modelName: string;
  status: string;
  isCached?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  mode,
  language,
  cursorLine,
  cursorCol,
  modelName,
  status,
  isCached,
}) => {
  return (
    <footer className="h-6 bg-[#161b22] border-t border-[#30363d] px-3 flex items-center justify-between text-[11px] font-mono text-[#8b949e] select-none z-30">
      {/* Left: Mode & Language */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Circle
            className={`w-2 h-2 fill-current ${
              status === "Analyzing..."
                ? "text-[#d29922] animate-pulse"
                : status === "Error"
                ? "text-[#f85149]"
                : "text-[#3fb950]"
            }`}
          />
          <span className="text-[#c9d1d9] font-medium uppercase">{mode}</span>
        </div>
        <span>•</span>
        <span className="capitalize">{language}</span>
        {isCached && (
          <>
            <span>•</span>
            <span className="text-[#3fb950]">[Cached]</span>
          </>
        )}
      </div>

      {/* Right: Position, Model, Status */}
      <div className="flex items-center gap-3">
        <span>
          Ln {cursorLine}, Col {cursorCol}
        </span>
        <span>•</span>
        <span className="text-[#c9d1d9]">{modelName}</span>
        <span>•</span>
        <span
          className={
            status === "Analyzing..."
              ? "text-[#d29922]"
              : status === "Error"
              ? "text-[#f85149]"
              : "text-[#3fb950]"
          }
        >
          {status}
        </span>
      </div>
    </footer>
  );
};

"use client";

import React from "react";
import { APP_CONFIG } from "@/lib/config";
import { Play, Loader2, ShieldCheck, Zap } from "lucide-react";

interface TopToolbarProps {
  language: string;
  onLanguageChange: (lang: string) => void;
  deep: boolean;
  onDeepChange: (deep: boolean) => void;
  allowVerification: boolean;
  onAllowVerificationChange: (allow: boolean) => void;
  onAnalyze: () => void;
  isLoading: boolean;
}

const LANGUAGES = [
  { value: "python", label: "Python (.py)" },
  { value: "javascript", label: "JavaScript (.js)" },
  { value: "typescript", label: "TypeScript (.ts)" },
  { value: "json", label: "JSON (.json)" },
  { value: "html", label: "HTML (.html)" },
  { value: "css", label: "CSS (.css)" },
  { value: "markdown", label: "Markdown (.md)" },
  { value: "plaintext", label: "Plain Text" },
];

export const TopToolbar: React.FC<TopToolbarProps> = ({
  language,
  onLanguageChange,
  deep,
  onDeepChange,
  allowVerification,
  onAllowVerificationChange,
  onAnalyze,
  isLoading,
}) => {
  return (
    <header className="h-11 bg-[#161b22] border-b border-[#30363d] px-3 flex items-center justify-between select-none">
      {/* Left: Brand */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm tracking-tight text-[#c9d1d9] flex items-center gap-1.5 font-mono">
          <span className="w-2.5 h-2.5 rounded-sm bg-[#2f81f7] inline-block" />
          {APP_CONFIG.displayName}
        </span>
        <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#21262d] border border-[#30363d] text-[#8b949e] font-mono">
          v{APP_CONFIG.version}
        </span>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-3">
        {/* Language selector */}
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-[#8b949e]">Language:</label>
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-[#c9d1d9] focus:outline-none focus:border-[#2f81f7] font-mono"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        {/* Quick / Deep toggle */}
        <div className="flex items-center bg-[#0d1117] border border-[#30363d] rounded p-0.5 text-xs">
          <button
            onClick={() => onDeepChange(false)}
            className={`px-2.5 py-0.5 rounded flex items-center gap-1 transition-colors ${
              !deep
                ? "bg-[#21262d] text-[#c9d1d9] font-medium"
                : "text-[#8b949e] hover:text-[#c9d1d9]"
            }`}
            title="Quick static and AI review without verification execution"
          >
            <Zap className="w-3 h-3 text-[#58a6ff]" />
            Quick
          </button>
          <button
            onClick={() => onDeepChange(true)}
            className={`px-2.5 py-0.5 rounded flex items-center gap-1 transition-colors ${
              deep
                ? "bg-[#21262d] text-[#c9d1d9] font-medium"
                : "text-[#8b949e] hover:text-[#c9d1d9]"
            }`}
            title="Deep review with optional sandbox reproduction"
          >
            <ShieldCheck className="w-3 h-3 text-[#2f81f7]" />
            Deep
          </button>
        </div>

        {/* Deep Verification Checkbox */}
        {deep && (
          <label className="flex items-center gap-1.5 text-xs text-[#8b949e] cursor-pointer hover:text-[#c9d1d9] select-none bg-[#0d1117] border border-[#30363d] px-2 py-1 rounded">
            <input
              type="checkbox"
              checked={allowVerification}
              onChange={(e) => onAllowVerificationChange(e.target.checked)}
              className="rounded bg-[#161b22] border-[#30363d] text-[#2f81f7] focus:ring-0 w-3.5 h-3.5 cursor-pointer accent-[#2f81f7]"
            />
            <span className="text-[11px]">Allow running code to verify findings</span>
          </label>
        )}

        {/* Analyze Button */}
        <button
          onClick={onAnalyze}
          disabled={isLoading}
          className="flex items-center gap-1.5 bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors"
          title="Shortcut: Ctrl+Enter (or Cmd+Enter)"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span>Analyze</span>
          <kbd className="hidden sm:inline-block ml-1 px-1 py-0.2 rounded bg-[rgba(0,0,0,0.25)] text-[10px] text-white/80 font-mono">
            Ctrl+↵
          </kbd>
        </button>
      </div>
    </header>
  );
};

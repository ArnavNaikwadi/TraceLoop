"use client";

import React, { useState, useRef, useEffect } from "react";
import { DiffEditor } from "@monaco-editor/react";
import {
  Terminal,
  GitCompare,
  AlertCircle,
  Maximize2,
  Minimize2,
  Trash2,
  Copy,
  Check,
} from "lucide-react";

export type BottomTab = "output" | "diff" | "error";

interface BottomPanelProps {
  activeTab: BottomTab;
  onTabChange: (tab: BottomTab) => void;
  logs: string[];
  onClearLogs: () => void;
  originalCode: string;
  diffCode: string;
  language: string;
  errorContext: string;
  onErrorContextChange: (err: string) => void;
  mode: "review" | "debug" | "explain";
  onApplyDiffFix?: () => void;
  canApplyFix?: boolean;
}

export const BottomPanel: React.FC<BottomPanelProps> = ({
  activeTab,
  onTabChange,
  logs,
  onClearLogs,
  originalCode,
  diffCode,
  language,
  errorContext,
  onErrorContextChange,
  mode,
  onApplyDiffFix,
  canApplyFix,
}) => {
  const [panelHeight, setPanelHeight] = useState<number>(180);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(180);

  // Resize handler
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = panelHeight;

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const deltaY = startYRef.current - ev.clientY;
      const newHeight = Math.min(Math.max(startHeightRef.current + deltaY, 90), 650);
      setPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleCopyDiff = () => {
    if (!diffCode) return;
    navigator.clipboard.writeText(diffCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayHeight = isMaximized ? "calc(100vh - 120px)" : `${panelHeight}px`;

  return (
    <div
      style={{ height: displayHeight }}
      className="bg-[#161b22] border-t border-[#30363d] flex flex-col z-20 transition-all duration-75 relative select-none"
    >
      {/* Resizer Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="h-1.5 w-full bg-[#161b22] hover:bg-[#2f81f7] cursor-row-resize flex items-center justify-center transition-colors"
        title="Drag to resize panel"
      >
        <div className="w-8 h-0.5 bg-[#30363d] rounded-full" />
      </div>

      {/* Panel Tab Header */}
      <div className="h-8 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between px-2 select-none">
        <div className="flex items-center gap-1">
          {/* Output Tab */}
          <button
            onClick={() => onTabChange("output")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded-t transition-colors ${
              activeTab === "output"
                ? "bg-[#0d1117] text-[#c9d1d9] border-t-2 border-[#2f81f7]"
                : "text-[#8b949e] hover:text-[#c9d1d9]"
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span>Output</span>
            {logs.length > 0 && (
              <span className="text-[10px] px-1 bg-[#21262d] rounded-full text-[#8b949e]">
                {logs.length}
              </span>
            )}
          </button>

          {/* Fix Diff Tab */}
          <button
            onClick={() => onTabChange("diff")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded-t transition-colors ${
              activeTab === "diff"
                ? "bg-[#0d1117] text-[#c9d1d9] border-t-2 border-[#2f81f7]"
                : "text-[#8b949e] hover:text-[#c9d1d9]"
            }`}
          >
            <GitCompare className="w-3.5 h-3.5 text-[#3fb950]" />
            <span>Fix Diff</span>
            {diffCode && diffCode !== originalCode && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950]" />
            )}
          </button>

          {/* Error Input Tab (highlighted in Debug mode) */}
          <button
            onClick={() => onTabChange("error")}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded-t transition-colors ${
              activeTab === "error"
                ? "bg-[#0d1117] text-[#c9d1d9] border-t-2 border-[#2f81f7]"
                : mode === "debug"
                ? "text-[#f0883e] hover:text-[#f0883e]/80"
                : "text-[#8b949e] hover:text-[#c9d1d9]"
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Error Input</span>
            {mode === "debug" && (
              <span className="text-[10px] px-1 bg-[#f0883e]/20 text-[#f0883e] rounded">
                Debug
              </span>
            )}
          </button>
        </div>

        {/* Panel Controls (Maximize, Clear) */}
        <div className="flex items-center gap-2">
          {activeTab === "output" && logs.length > 0 && (
            <button
              onClick={onClearLogs}
              title="Clear output logs"
              className="p-1 text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}

          {activeTab === "diff" && diffCode && (
            <div className="flex items-center gap-1 mr-2">
              <button
                onClick={handleCopyDiff}
                className="flex items-center gap-1 text-[11px] text-[#8b949e] hover:text-[#c9d1d9] px-2 py-0.5 rounded bg-[#21262d] border border-[#30363d]"
              >
                {copied ? <Check className="w-3 h-3 text-[#3fb950]" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy Fix"}</span>
              </button>
              {onApplyDiffFix && (
                <button
                  onClick={onApplyDiffFix}
                  disabled={!canApplyFix}
                  className="flex items-center gap-1 text-[11px] text-white bg-[#238636] hover:bg-[#2ea043] disabled:opacity-40 px-2 py-0.5 rounded"
                  title={canApplyFix ? "Apply this fix to editor" : "Results out of date. Re-analyze to apply"}
                >
                  Apply Fix
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? "Restore size" : "Maximize panel"}
            className="p-1 text-[#8b949e] hover:text-[#c9d1d9] hover:bg-[#21262d] rounded"
          >
            {isMaximized ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 bg-[#0d1117] overflow-hidden select-text font-mono text-xs">
        {/* Output Log Tab */}
        {activeTab === "output" && (
          <div className="h-full overflow-y-auto p-3 space-y-1">
            {logs.length === 0 ? (
              <p className="text-[#8b949e] italic text-xs">
                Pipeline messages and tool logs will appear here during analysis.
              </p>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="leading-relaxed flex items-start gap-2">
                  <span className="text-[#8b949e] shrink-0 select-none">
                    [{new Date().toLocaleTimeString()}]
                  </span>
                  <span
                    className={
                      log.startsWith("[Error]")
                        ? "text-[#f85149]"
                        : log.startsWith("[Verified]")
                        ? "text-[#3fb950]"
                        : log.startsWith("[AI]")
                        ? "text-[#58a6ff]"
                        : log.startsWith("[Static]")
                        ? "text-[#d29922]"
                        : "text-[#c9d1d9]"
                    }
                  >
                    {log}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* Fix Diff Tab */}
        {activeTab === "diff" && (
          <div className="h-full w-full">
            {diffCode ? (
              <DiffEditor
                height="100%"
                original={originalCode}
                modified={diffCode}
                language={language}
                theme="vs-dark"
                options={{
                  fontSize: 12,
                  fontFamily: "JetBrains Mono, monospace",
                  readOnly: true,
                  renderSideBySide: true,
                  automaticLayout: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-[#8b949e] italic">
                Select &quot;View Fix&quot; on any finding to preview the code diff here.
              </div>
            )}
          </div>
        )}

        {/* Error Input Tab */}
        {activeTab === "error" && (
          <div className="h-full p-2 flex flex-col">
            <div className="text-[11px] text-[#8b949e] mb-1">
              Paste runtime error message, exception, or traceback to diagnose in Debug mode:
            </div>
            <textarea
              value={errorContext}
              onChange={(e) => onErrorContextChange(e.target.value)}
              placeholder="e.g. TypeError: unsupported operand type(s) for /: 'int' and 'NoneType'&#10;  File 'main.py', line 14, in get_user_data"
              className="flex-1 w-full bg-[#161b22] border border-[#30363d] rounded p-2 text-xs text-[#c9d1d9] focus:outline-none focus:border-[#2f81f7] resize-none font-mono"
            />
          </div>
        )}
      </div>
    </div>
  );
};

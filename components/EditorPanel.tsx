"use client";

import React, { useRef, useEffect, useCallback, useState } from "react";
import Editor, { Monaco, OnMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { Finding } from "@/lib/schema";
import {
  FileCode,
  FolderOpen,
  Sparkles,
  AlertTriangle,
  Check,
  Upload,
} from "lucide-react";

const GithubIcon: React.FC<{ className?: string }> = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
);

interface EditorPanelProps {
  code: string;
  onCodeChange: (newCode: string) => void;
  language: string;
  onLanguageChange: (lang: string) => void;
  fileName: string;
  onFileNameChange: (name: string) => void;
  onLoadSample: () => void;
  findings: Finding[];
  selectedLine?: number;
  onCursorChange?: (line: number, col: number) => void;
  isOutOfDate: boolean;
  onAnalyzeShortcut: () => void;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({
  code,
  onCodeChange,
  language,
  onLanguageChange,
  fileName,
  onFileNameChange,
  onLoadSample,
  findings,
  selectedLine,
  onCursorChange,
  isOutOfDate,
  onAnalyzeShortcut,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [githubUrl, setGithubUrl] = useState("");
  const [githubError, setGithubError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  // Auto-detect language helper
  const detectLanguage = (name: string, content: string): string => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "py") return "python";
    if (ext === "js" || ext === "mjs" || ext === "jsx") return "javascript";
    if (ext === "ts" || ext === "tsx") return "typescript";
    if (ext === "json") return "json";
    if (ext === "html") return "html";
    if (ext === "css") return "css";
    if (ext === "md") return "markdown";

    // Check fenced code block
    const fenceMatch = content.match(/^```(\w+)/);
    if (fenceMatch && fenceMatch[1]) {
      const fenceLang = fenceMatch[1].toLowerCase();
      if (fenceLang === "py" || fenceLang === "python") return "python";
      if (fenceLang === "js" || fenceLang === "javascript") return "javascript";
      if (fenceLang === "ts" || fenceLang === "typescript") return "typescript";
      if (fenceLang === "json") return "json";
      if (fenceLang === "html") return "html";
      if (fenceLang === "css") return "css";
    }

    return language;
  };

  const handleEditorDidMount: OnMount = (editorInstance, monacoInstance) => {
    editorRef.current = editorInstance;
    monacoRef.current = monacoInstance;

    // Track cursor changes
    editorInstance.onDidChangeCursorPosition((e) => {
      onCursorChange?.(e.position.lineNumber, e.position.column);
    });

    // Add keyboard shortcut Ctrl+Enter / Cmd+Enter
    editorInstance.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter,
      () => {
        onAnalyzeShortcut();
      }
    );

    // Initial decorations
    updateDecorations();
  };

  const updateDecorations = useCallback(() => {
    if (!editorRef.current || !monacoRef.current) return;

    const newDecorations: editor.IModelDeltaDecoration[] = findings.map((f) => {
      const line = Math.max(1, f.line);
      const endLine = Math.max(line, f.endLine || line);

      return {
        range: new monacoRef.current!.Range(line, 1, endLine, 1000),
        options: {
          isWholeLine: false,
          glyphMarginClassName: `monaco-glyph-${f.severity}`,
          inlineClassName: `monaco-wavy-${f.severity}`,
          linesDecorationsClassName: `monaco-glyph-${f.severity}`,
          hoverMessage: {
            value: `**[${f.severity.toUpperCase()}] ${f.title}**\n\n${f.why}\n\n*Fix:* \`${f.fix || "See findings panel"}\``,
          },
        },
      };
    });

    decorationsRef.current = editorRef.current.deltaDecorations(
      decorationsRef.current,
      newDecorations
    );
  }, [findings]);

  useEffect(() => {
    updateDecorations();
  }, [updateDecorations]);

  // Jump to selected finding line
  useEffect(() => {
    if (selectedLine && editorRef.current) {
      editorRef.current.revealLineInCenter(selectedLine);
      editorRef.current.setPosition({ lineNumber: selectedLine, column: 1 });
      editorRef.current.focus();
    }
  }, [selectedLine]);

  // Open File Handler
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content !== undefined) {
        onFileNameChange(file.name);
        const detected = detectLanguage(file.name, content);
        onLanguageChange(detected);
        onCodeChange(content);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content !== undefined) {
        onFileNameChange(file.name);
        const detected = detectLanguage(file.name, content);
        onLanguageChange(detected);
        onCodeChange(content);
      }
    };
    reader.readAsText(file);
  };

  // GitHub URL import (Strictly allowed to github.com and raw.githubusercontent.com only)
  const handleImportGithub = async () => {
    setGithubError("");
    try {
      const parsed = new URL(githubUrl);
      const isGitHubDomain =
        parsed.hostname === "github.com" ||
        parsed.hostname === "raw.githubusercontent.com";

      if (!isGitHubDomain) {
        setGithubError("Only github.com or raw.githubusercontent.com URLs are permitted.");
        return;
      }

      let fetchUrl = githubUrl;
      if (parsed.hostname === "github.com") {
        // Convert https://github.com/user/repo/blob/main/path/file.py to raw URL
        fetchUrl = githubUrl
          .replace("github.com", "raw.githubusercontent.com")
          .replace("/blob/", "/");
      }

      const res = await fetch(fetchUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch file (HTTP ${res.status})`);
      }
      const text = await res.text();
      const extractedFileName = fetchUrl.split("/").pop() || "github_imported.py";

      onFileNameChange(extractedFileName);
      const detected = detectLanguage(extractedFileName, text);
      onLanguageChange(detected);
      onCodeChange(text);
      setShowGithubModal(false);
      setGithubUrl("");
    } catch (err: unknown) {
      setGithubError(err instanceof Error ? err.message : "Failed to load GitHub file");
    }
  };

  return (
    <div
      className={`flex-1 flex flex-col bg-[#0d1117] h-full overflow-hidden relative ${
        isDragging ? "ring-2 ring-[#2f81f7] ring-inset" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Tab bar */}
      <div className="h-9 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between px-3 select-none">
        {/* Left: Active Tab */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#0d1117] border-t border-x border-[#30363d] rounded-t text-xs text-[#c9d1d9] font-mono">
            <FileCode className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span>{fileName}</span>
          </div>

          {/* Results Out of Date indicator */}
          {isOutOfDate && (
            <div className="flex items-center gap-1 text-[11px] text-[#d29922] bg-[#d29922]/10 border border-[#d29922]/30 px-2 py-0.5 rounded font-mono">
              <AlertTriangle className="w-3 h-3 text-[#d29922]" />
              <span>Results out of date</span>
            </div>
          )}
        </div>

        {/* Right: Quick actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onLoadSample}
            className="flex items-center gap-1 text-xs text-[#8b949e] hover:text-[#c9d1d9] px-2 py-1 rounded hover:bg-[#21262d] transition-colors"
            title="Load sample vulnerable code (works offline without API key)"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#d29922]" />
            <span>Load Sample</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 text-xs text-[#8b949e] hover:text-[#c9d1d9] px-2 py-1 rounded hover:bg-[#21262d] transition-colors"
            title="Open local file or drag-and-drop into editor"
          >
            <FolderOpen className="w-3.5 h-3.5 text-[#58a6ff]" />
            <span>Open File</span>
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept=".py,.js,.ts,.tsx,.jsx,.json,.html,.css,.md,.txt"
          />

          <button
            onClick={() => setShowGithubModal(true)}
            className="flex items-center gap-1 text-xs text-[#8b949e] hover:text-[#c9d1d9] px-2 py-1 rounded hover:bg-[#21262d] transition-colors"
            title="Fetch public file from GitHub"
          >
            <GithubIcon className="w-3.5 h-3.5 text-[#c9d1d9]" />
            <span>GitHub URL</span>
          </button>
        </div>
      </div>

      {/* Drag & drop overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-[#0d1117]/80 z-20 flex flex-col items-center justify-center text-[#c9d1d9] pointer-events-none">
          <Upload className="w-8 h-8 text-[#2f81f7] mb-2 animate-bounce" />
          <p className="text-sm font-medium">Drop code file to import</p>
        </div>
      )}

      {/* GitHub Import Modal */}
      {showGithubModal && (
        <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-md p-4 w-full max-w-md shadow-xl">
            <h3 className="text-sm font-semibold text-[#c9d1d9] mb-1 flex items-center gap-2">
              <GithubIcon className="w-4 h-4 text-[#2f81f7]" />
              Import Public GitHub File
            </h3>
            <p className="text-xs text-[#8b949e] mb-3">
              Enter a link to a file on github.com. Only GitHub domains are allowed.
            </p>
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/owner/repo/blob/main/src/app.py"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded px-3 py-1.5 text-xs text-[#c9d1d9] focus:outline-none focus:border-[#2f81f7] mb-2 font-mono"
            />
            {githubError && (
              <p className="text-xs text-[#f85149] mb-2">{githubError}</p>
            )}
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => {
                  setShowGithubModal(false);
                  setGithubError("");
                }}
                className="px-3 py-1 text-xs text-[#8b949e] hover:text-[#c9d1d9] bg-[#21262d] rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleImportGithub}
                disabled={!githubUrl}
                className="px-3 py-1 text-xs text-white bg-[#2f81f7] hover:bg-[#1f6feb] disabled:opacity-50 rounded"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Center Monaco Editor */}
      <div className="flex-1 w-full h-full relative">
        <Editor
          height="100%"
          language={language}
          value={code}
          theme="vs-dark"
          onChange={(val) => onCodeChange(val || "")}
          onMount={handleEditorDidMount}
          options={{
            fontSize: 13,
            fontFamily: "JetBrains Mono, Menlo, Monaco, Consolas, monospace",
            lineNumbers: "on",
            glyphMargin: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            minimap: { enabled: false },
            padding: { top: 8, bottom: 8 },
            renderLineHighlight: "all",
            renderWhitespace: "selection",
            tabSize: 4,
            wordWrap: "on",
          }}
        />
      </div>
    </div>
  );
};

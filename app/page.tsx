"use client";

import React, { useState, useEffect, useCallback } from "react";
import { TopToolbar } from "@/components/TopToolbar";
import { ActivityRail, Mode } from "@/components/ActivityRail";
import { EditorPanel } from "@/components/EditorPanel";
import { BottomPanel, BottomTab } from "@/components/BottomPanel";
import { FindingsPanel } from "@/components/FindingsPanel";
import { StatusBar } from "@/components/StatusBar";
import { Finding, DebugDiagnosis, ExplainDetail, AnalysisResponse } from "@/lib/schema";
import { SAMPLE_PYTHON_CODE, BUNDLED_SAMPLE_RESPONSE } from "@/lib/analysis/cache";
import { applyFixToCode, isCodeStale } from "@/lib/analysis/patching";
import { APP_CONFIG } from "@/lib/config";

export default function Home() {
  const [code, setCode] = useState<string>("");
  const [analyzedCode, setAnalyzedCode] = useState<string>("");
  const [language, setLanguage] = useState<string>("python");
  const [fileName, setFileName] = useState<string>("main.py");
  const [mode, setMode] = useState<Mode>("review");
  const [deep, setDeep] = useState<boolean>(false);
  const [allowVerification, setAllowVerification] = useState<boolean>(false);
  const [level, setLevel] = useState<"beginner" | "intermediate" | "expert">("intermediate");
  const [errorContext, setErrorContext] = useState<string>("");

  const [findings, setFindings] = useState<Finding[]>([]);
  const [score, setScore] = useState<number>(100);
  const [diagnosis, setDiagnosis] = useState<DebugDiagnosis | undefined>();
  const [explanationDetail, setExplanationDetail] = useState<ExplainDetail | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);

  const [selectedLine, setSelectedLine] = useState<number | undefined>();
  const [bottomTab, setBottomTab] = useState<BottomTab>("output");
  const [diffCode, setDiffCode] = useState<string>("");
  const [activeFixFinding, setActiveFixFinding] = useState<Finding | null>(null);

  const [cursorLine, setCursorLine] = useState<number>(1);
  const [cursorCol, setCursorCol] = useState<number>(1);
  const [modelUsed, setModelUsed] = useState<string>(APP_CONFIG.defaultModel);
  const [engineStatus, setEngineStatus] = useState<string>("Ready");
  const [isCached, setIsCached] = useState<boolean>(false);
  const [isLlmOnly, setIsLlmOnly] = useState<boolean>(false);

  // Check if code has changed since last analysis
  const isOutOfDate = analyzedCode.length > 0 && isCodeStale(analyzedCode, code);

  // Perform Analysis
  const runAnalysis = useCallback(
    async (codeToAnalyze?: string) => {
      const targetCode = codeToAnalyze !== undefined ? codeToAnalyze : code;
      if (!targetCode || targetCode.trim() === "") {
        setApiError("Please paste or load code before analyzing.");
        return;
      }

      setIsLoading(true);
      setApiError("");
      setEngineStatus("Analyzing...");
      setIsCached(false);

      const timestamp = new Date().toLocaleTimeString();
      setLogs((prev) => [
        ...prev,
        `[${timestamp}] Starting ${mode.toUpperCase()} analysis (${deep ? "Deep" : "Quick"}, ${language})`,
      ]);

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: targetCode,
            language,
            mode,
            level,
            deep,
            allowVerification,
            errorContext,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || `HTTP error ${res.status}`);
        }

        const response = data as AnalysisResponse & { pipelineLogs?: string[] };

        setFindings(response.findings || []);
        setScore(response.score ?? 100);
        setDiagnosis(response.diagnosis);
        setExplanationDetail(response.explanationDetail);
        setAnalyzedCode(targetCode);
        setModelUsed(response.meta?.modelUsed || APP_CONFIG.defaultModel);
        setIsCached(Boolean(response.meta?.fromCache));

        const tools = response.meta?.toolsRan || [];
        const hasStatic = tools.some((t) => t === "ruff" || t === "bandit" || t === "eslint");
        setIsLlmOnly(!hasStatic && tools.length > 0);

        if (response.meta?.fromCache) {
          setEngineStatus("Cached");
        } else if (response.meta?.deep && allowVerification) {
          setEngineStatus("Deep Verified");
        } else if (!hasStatic) {
          setEngineStatus("LLM only");
        } else {
          setEngineStatus("Ready");
        }

        if (response.pipelineLogs) {
          setLogs((prev) => [...prev, ...response.pipelineLogs!]);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to run analysis";
        setApiError(msg);
        setEngineStatus("Error");
        setLogs((prev) => [...prev, `[Error] ${msg}`]);
      } finally {
        setIsLoading(false);
      }
    },
    [code, language, mode, level, deep, allowVerification, errorContext]
  );

  // Keyboard shortcut Ctrl+Enter / Cmd+Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runAnalysis();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [runAnalysis]);

  // Load Sample Button (Works completely offline without API key)
  const handleLoadSample = () => {
    setCode(SAMPLE_PYTHON_CODE);
    setFileName("sample_vulnerable.py");
    setLanguage("python");
    setErrorContext("TypeError: unsupported operand type(s) for /: 'int' and 'NoneType'\n  File 'sample_vulnerable.py', line 14, in get_user_data");
    setLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Loaded bundled sample with known security & runtime issues`,
    ]);

    // Automatically analyze the sample code (hits pre-seeded in-memory cache)
    runAnalysis(SAMPLE_PYTHON_CODE);
  };

  // View Fix
  const handleViewFix = (finding: Finding) => {
    setActiveFixFinding(finding);
    const patch = applyFixToCode(code, finding.line, finding.endLine, finding.fix);
    if (patch.success) {
      setDiffCode(patch.newCode);
      setBottomTab("diff");
    } else {
      setLogs((prev) => [...prev, `[Patch Error] ${patch.error}`]);
    }
  };

  // Apply Fix
  const handleApplyFix = (finding: Finding) => {
    if (isOutOfDate) {
      setLogs((prev) => [
        ...prev,
        `[Warning] Code changed since analysis. Re-analyze before applying this fix.`,
      ]);
      return;
    }

    const patch = applyFixToCode(code, finding.line, finding.endLine, finding.fix);
    if (!patch.success) {
      setLogs((prev) => [...prev, `[Apply Error] ${patch.error}`]);
      return;
    }

    setCode(patch.newCode);
    setLogs((prev) => [
      ...prev,
      `[Applied Fix] Applied '${finding.title}' at line ${finding.line}`,
    ]);

    // If line count changed, re-run analysis automatically
    if (patch.lineCountChanged) {
      setLogs((prev) => [
        ...prev,
        `[Auto-Reanalysis] Line count changed by ${patch.linesDelta} line(s) - rerunning analysis`,
      ]);
      runAnalysis(patch.newCode);
    }
  };

  // Apply diff fix directly from bottom panel
  const handleApplyDiffFix = () => {
    if (activeFixFinding) {
      handleApplyFix(activeFixFinding);
    } else if (diffCode && !isOutOfDate) {
      setCode(diffCode);
      runAnalysis(diffCode);
    }
  };

  // Switch modes from Activity Rail
  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    if (newMode === "debug") {
      setBottomTab("error");
    }
  };

  const isEmpty = code.trim() === "" && findings.length === 0;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0d1117] text-[#c9d1d9]">
      {/* Top Toolbar */}
      <TopToolbar
        language={language}
        onLanguageChange={setLanguage}
        deep={deep}
        onDeepChange={setDeep}
        allowVerification={allowVerification}
        onAllowVerificationChange={setAllowVerification}
        onAnalyze={() => runAnalysis()}
        isLoading={isLoading}
      />

      {/* Main Center Area: Activity Rail + Editor & Bottom Panel + Findings Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Activity Rail */}
        <ActivityRail activeMode={mode} onModeChange={handleModeChange} />

        {/* Center: Editor + Bottom Panel */}
        <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
          <EditorPanel
            code={code}
            onCodeChange={setCode}
            language={language}
            onLanguageChange={setLanguage}
            fileName={fileName}
            onFileNameChange={setFileName}
            onLoadSample={handleLoadSample}
            findings={findings}
            selectedLine={selectedLine}
            onCursorChange={(ln, col) => {
              setCursorLine(ln);
              setCursorCol(col);
            }}
            isOutOfDate={isOutOfDate}
            onAnalyzeShortcut={() => runAnalysis()}
          />

          <BottomPanel
            activeTab={bottomTab}
            onTabChange={setBottomTab}
            logs={logs}
            onClearLogs={() => setLogs([])}
            originalCode={code}
            diffCode={diffCode}
            language={language}
            errorContext={errorContext}
            onErrorContextChange={setErrorContext}
            mode={mode}
            onApplyDiffFix={handleApplyDiffFix}
            canApplyFix={!isOutOfDate && (Boolean(diffCode) || Boolean(activeFixFinding))}
          />
        </div>

        {/* Right Findings Panel */}
        <FindingsPanel
          mode={mode}
          score={score}
          findings={findings}
          diagnosis={diagnosis}
          explanationDetail={explanationDetail}
          level={level}
          onLevelChange={setLevel}
          isLoading={isLoading}
          isEmpty={isEmpty}
          error={apiError}
          onRetry={() => runAnalysis()}
          isOutOfDate={isOutOfDate}
          isLlmOnly={isLlmOnly}
          isQuickMode={!deep}
          onSelectLine={(ln) => setSelectedLine(ln)}
          onViewFix={handleViewFix}
          onApplyFix={handleApplyFix}
          canApplyFix={!isOutOfDate}
        />
      </div>

      {/* Bottom Status Bar */}
      <StatusBar
        mode={mode}
        language={language}
        cursorLine={cursorLine}
        cursorCol={cursorCol}
        modelName={modelUsed}
        status={engineStatus}
        isCached={isCached}
      />
    </div>
  );
}

export interface PatchResult {
  success: boolean;
  newCode: string;
  lineCountChanged: boolean;
  linesDelta: number;
  error?: string;
}

/**
 * Apply a fix to code given target line and replacement.
 * Uses 1-indexed line numbers.
 */
export function applyFixToCode(
  originalCode: string,
  targetLine: number,
  endLine: number,
  replacementFix: string
): PatchResult {
  const lines = originalCode.split("\n");
  const origLineCount = lines.length;

  if (targetLine < 1 || targetLine > lines.length) {
    return {
      success: false,
      newCode: originalCode,
      lineCountChanged: false,
      linesDelta: 0,
      error: `Target line ${targetLine} is out of bounds (1..${lines.length})`,
    };
  }

  const effectiveEndLine = Math.min(Math.max(targetLine, endLine || targetLine), lines.length);

  const before = lines.slice(0, targetLine - 1);
  const after = lines.slice(effectiveEndLine);
  const replacementLines = replacementFix.split("\n");

  const newLines = [...before, ...replacementLines, ...after];
  const newCode = newLines.join("\n");
  const newLineCount = newLines.length;
  const linesDelta = newLineCount - origLineCount;

  return {
    success: true,
    newCode,
    lineCountChanged: linesDelta !== 0,
    linesDelta,
  };
}

/**
 * Check if the current editor code differs from the code analyzed.
 */
export function isCodeStale(analyzedCode: string, currentCode: string): boolean {
  return analyzedCode.trim() !== currentCode.trim();
}

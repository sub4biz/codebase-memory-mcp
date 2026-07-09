import { useEffect, useState } from "react";
import type { GraphNode } from "../lib/types";

/* Upstream tracker for indexing gaps — issues land on the codebase-memory-mcp
 * project itself (the tool that failed to index), never the user's repo. */
const UPSTREAM_ISSUES_URL = "https://github.com/DeusData/codebase-memory-mcp/issues/new";

interface MissedCalloutProps {
  node: GraphNode;
  project: string | null;
  onClose: () => void;
}

function buildIssueUrl(path: string, project: string | null): string {
  const title = `Indexing gap: ${path}`;
  const body = [
    "## Not fully indexed (best-effort coverage signal)",
    "",
    `- **File:** \`${path}\``,
    `- **Project:** \`${project ?? "unknown"}\``,
    "",
    "<!-- Please add: the flagged line ranges from index_status (parse_partial),",
    "the language and the construct that fails to parse, and a minimal snippet",
    "of the affected code — ONLY if the code is shareable. -->",
    "",
    "_Reported from the graph UI's missed-coverage view._",
  ].join("\n");
  return `${UPSTREAM_ISSUES_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

function buildAgentPrompt(path: string, project: string | null): string {
  return (
    `codebase-memory-mcp could not fully index \`${path}\`` +
    (project ? ` (project \`${project}\`)` : "") +
    " — best-effort coverage signal. Please: " +
    "1) call the index_status MCP tool and note this file's flagged line ranges under parse_partial; " +
    "2) read those ranges in the file and summarize which construct fails to parse; " +
    `3) file a GitHub issue at ${UPSTREAM_ISSUES_URL} titled "Indexing gap: ${path}" ` +
    "with the summary — include a minimal reproducible snippet ONLY if the code is shareable."
  );
}

/* Right-panel callout shown when a missed-skeleton node is selected: explains
 * the gap and offers two working actions — a prefilled upstream issue and a
 * ready-made agent prompt (clipboard, with visible feedback). */
export function MissedCallout({ node, project, onClose }: MissedCalloutProps) {
  const path = node.file_path || node.name;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(buildAgentPrompt(path, project));
      setCopied(true);
    } catch {
      /* clipboard unavailable (permissions/insecure context) — leave the
       * button state unchanged so the failure is visible, not silent */
    }
  };

  return (
    <div className="h-full flex flex-col p-4 gap-3 overflow-y-auto">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] text-foreground/30 uppercase tracking-widest">
            Not fully indexed
          </p>
          <p className="text-sm font-medium text-foreground/90 break-all mt-1">{path}</p>
          <p className="text-[10px] text-foreground/40 mt-0.5">{node.label}</p>
        </div>
        <button
          onClick={onClose}
          className="text-foreground/40 hover:text-foreground/80 text-sm px-1"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <p className="text-[12px] leading-relaxed text-foreground/70">
        We did not manage to fully index this part of your code — constructs here may be
        missing from the graph (best-effort detection; the file content itself is ground
        truth).
      </p>
      <p className="text-[12px] leading-relaxed text-foreground/70">
        Help us handle this edge case too: let your agent summarize what fails to parse
        here and file a GitHub issue for the codebase-memory-mcp project.
      </p>

      <div className="flex flex-col gap-2 mt-1">
        <button
          onClick={copyPrompt}
          className={`text-[12px] font-medium rounded-md border px-3 py-1.5 transition-all text-left ${
            copied
              ? "border-primary/60 bg-primary/15 text-primary"
              : "border-white/10 bg-white/[0.03] text-foreground/80 hover:bg-white/[0.07]"
          }`}
        >
          {copied ? "✓ Copied — paste it to your agent" : "Copy agent prompt"}
        </button>
        <a
          href={buildIssueUrl(path, project)}
          target="_blank"
          rel="noreferrer"
          className="text-[12px] font-medium rounded-md border border-white/10 bg-white/[0.03] text-foreground/80 hover:bg-white/[0.07] px-3 py-1.5 transition-all"
        >
          File a GitHub issue (prefilled) ↗
        </a>
      </div>

      <p className="text-[10px] leading-snug text-foreground/35 mt-1">
        The prefilled issue contains only the file path and project name — add code
        snippets only if they are shareable.
      </p>
    </div>
  );
}

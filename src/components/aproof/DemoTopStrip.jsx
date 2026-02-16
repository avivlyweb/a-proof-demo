import { Button } from "@/components/ui/button";
import { FileText, RotateCcw } from "lucide-react";

export default function DemoTopStrip({
  conversationMode,
  voiceStatus,
  hasFindings,
  transcriptCount,
  eventCount,
  debugMetrics,
  onSetConversationMode,
  onReset,
  onOpenClinical,
}) {
  const statusTone =
    voiceStatus?.startsWith("Fout") || voiceStatus === "Data kanaal gesloten"
      ? "text-aproof-coral"
      : "text-aproof-teal";

  const formatTs = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <div className="aproof-panel aproof-appear px-4 py-3.5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">A-PROOF Live Dashboard</p>
          <p className="text-sm font-medium text-foreground">
            {conversationMode === "leo"
              ? "Leo is actief. Focus op warm gesprek en context."
              : "Klinische modus actief. Overzicht voor zorgverlener zichtbaar."}
          </p>
          <p className={`text-xs mt-1 ${statusTone}`}>Status: {voiceStatus}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="aproof-chip">Turns: {transcriptCount}</span>
          <span className="aproof-chip">Insights: {eventCount}</span>
          <span className="aproof-chip">Transcript: {formatTs(debugMetrics?.lastTranscriptEvent)}</span>
          <span className="aproof-chip">Analyse: {formatTs(debugMetrics?.lastAnalysisRun)}</span>
          <span className="aproof-chip">Runs: {debugMetrics?.analysisCount || 0}</span>
          <span className="aproof-chip">Taal fixes: {debugMetrics?.languageFixes || 0}</span>
          <div className="flex items-center rounded-full border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => onSetConversationMode?.("leo")}
              className={`h-8 px-3 text-xs ${
                conversationMode === "leo" ? "bg-muted text-foreground" : "text-muted-foreground"
              }`}
            >
              Gesprek
            </button>
            <button
              type="button"
              onClick={() => onSetConversationMode?.("clinical")}
              disabled={!hasFindings}
              className={`h-8 px-3 text-xs ${
                conversationMode === "clinical" ? "bg-muted text-foreground" : "text-muted-foreground"
              } disabled:opacity-40`}
            >
              Klinisch
            </button>
          </div>
          <Button variant="ghost" onClick={onReset} className="h-8 px-3 border border-border">
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Reset
          </Button>
          <Button onClick={onOpenClinical} disabled={!hasFindings} className="h-8 px-3 bg-aproof-coral hover:bg-aproof-coral/85">
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Overzicht
          </Button>
        </div>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { FileText, RotateCcw } from "lucide-react";

export default function DemoTopStrip({
  conversationMode,
  voiceStatus,
  hasFindings,
  transcriptCount,
  eventCount,
  onSetConversationMode,
  onReset,
  onOpenClinical,
}) {
  const statusTone =
    voiceStatus?.startsWith("Fout") || voiceStatus === "Data kanaal gesloten"
      ? "text-aproof-coral"
      : "text-aproof-teal";

  return (
    <div className="bg-white border border-border rounded-2xl px-4 py-3.5 shadow-sm">
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
          <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-foreground">Turns: {transcriptCount}</span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-muted text-foreground">Insights: {eventCount}</span>
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

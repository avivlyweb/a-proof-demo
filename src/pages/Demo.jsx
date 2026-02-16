import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import VoiceInput from "@/components/aproof/VoiceInput";
import DomainBars from "@/components/aproof/DomainBars";
import EvidencePanel from "@/components/aproof/EvidencePanel";
import ContextFactorsPanel from "@/components/aproof/ContextFactorsPanel";
import TranscriptPanel from "@/components/aproof/TranscriptPanel";
import ClinicalSummary from "@/components/aproof/ClinicalSummary";
import { ArrowLeft, FileText, RotateCcw } from "lucide-react";

export default function Demo() {
  const [transcript, setTranscript] = useState([]);
  const [domainLevels, setDomainLevels] = useState({});
  const [summary, setSummary] = useState("");
  const [contextFactors, setContextFactors] = useState([]);
  const [voiceStatus, setVoiceStatus] = useState("Klaar om te beginnen");
  const [showClinicalReport, setShowClinicalReport] = useState(false);

  // Append a turn to the transcript
  const handleTranscript = useCallback((entry) => {
    setTranscript((prev) => [...prev, entry]);
  }, []);

  // Process ICF analysis response and merge into domainLevels
  const handleAnalysis = useCallback((payload) => {
    if (!payload) return;
    const domains = payload.domains || [];
    const factors = payload.context_factors || [];

    setDomainLevels((prev) => {
      const next = { ...prev };
      for (const d of domains) {
        if (!d.code) continue;
        next[d.code] = {
          level: d.level,
          confidence: d.confidence,
          evidence: d.evidence || [],
          reasoning: d.reasoning || "",
        };
      }
      return next;
    });

    if (payload.summary) setSummary(payload.summary);
    if (Array.isArray(factors)) setContextFactors(factors);
  }, []);

  const resetConversation = useCallback(() => {
    setTranscript([]);
    setDomainLevels({});
    setSummary("");
    setContextFactors([]);
    setShowClinicalReport(false);
  }, []);

  const hasFindings = transcript.length > 0 || Object.keys(domainLevels).length > 0 || !!summary;
  const statusTone =
    voiceStatus.startsWith("Fout") || voiceStatus === "Data kanaal gesloten"
      ? "text-aproof-coral"
      : "text-aproof-teal";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav bar */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Terug
          </Link>
          <h1 className="text-lg font-bold text-aproof-coral tracking-tight">
            A-PROOF Demo
          </h1>
          <div className="w-16" /> {/* spacer */}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <Card className="bg-white border-none shadow-md mb-6">
          <CardContent className="py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Gespreksmodus</p>
              <p className="text-sm font-medium text-foreground">
                Leo is actief voor een warm gesprek. Klinisch rapport alleen op aanvraag.
              </p>
              <p className={`text-xs mt-1 ${statusTone}`}>Status: {voiceStatus}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={resetConversation}
                className="border border-border text-foreground hover:bg-muted"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset gesprek
              </Button>
              <Button
                onClick={() => setShowClinicalReport(true)}
                disabled={!hasFindings}
                className="bg-aproof-coral hover:bg-aproof-coral/85"
              >
                <FileText className="w-4 h-4 mr-2" />
                Genereer klinisch overzicht
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* -------- Left column -------- */}
          <div className="space-y-6">
            {/* Voice control */}
            <Card className="bg-white border-none shadow-md">
              <CardContent className="flex flex-col items-center py-8">
                <h2 className="text-lg font-semibold mb-4">Spraak invoer</h2>
                <VoiceInput
                  onTranscript={handleTranscript}
                  onAnalysis={handleAnalysis}
                  onStatusChange={setVoiceStatus}
                />
              </CardContent>
            </Card>

            {/* Transcript */}
            <Card className="bg-white border-none shadow-md">
              <CardContent>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Transcript
                </h2>
                <TranscriptPanel transcript={transcript} />
              </CardContent>
            </Card>
          </div>

          {/* -------- Right column -------- */}
          <div className="space-y-6">
            {/* Domain bars — the hero */}
            <Card className="bg-white border-none shadow-md">
              <CardContent>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  ICF-domeinen
                </h2>
                <DomainBars domainLevels={domainLevels} />
              </CardContent>
            </Card>

            {/* Evidence */}
            <Card className="bg-white border-none shadow-md">
              <CardContent>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Sleutelwoorden
                </h2>
                <EvidencePanel domainLevels={domainLevels} />
              </CardContent>
            </Card>

            <Card className="bg-white border-none shadow-md">
              <CardContent>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Omgevingsfactoren
                </h2>
                <ContextFactorsPanel factors={contextFactors} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Full-width clinical summary */}
        {showClinicalReport && (summary || Object.keys(domainLevels).length > 0) && (
          <Card className="bg-white border-none shadow-md mt-6">
            <CardContent>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Klinisch overzicht
              </h2>
              <ClinicalSummary domainLevels={domainLevels} summary={summary} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

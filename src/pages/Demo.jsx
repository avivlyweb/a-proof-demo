import { useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import VoiceInput from "@/components/aproof/VoiceInput";
import DomainBars from "@/components/aproof/DomainBars";
import EvidencePanel from "@/components/aproof/EvidencePanel";
import ContextFactorsPanel from "@/components/aproof/ContextFactorsPanel";
import TranscriptPanel from "@/components/aproof/TranscriptPanel";
import ClinicalSummary from "@/components/aproof/ClinicalSummary";
import InteractionPanel from "@/components/aproof/InteractionPanel";
import InteractionMap from "@/components/aproof/InteractionMap";
import SessionTimeline from "@/components/aproof/SessionTimeline";
import DemoTopStrip from "@/components/aproof/DemoTopStrip";
import TopIcfCodesPanel from "@/components/aproof/TopIcfCodesPanel";
import { APROOF_DOMAINS } from "@/lib/aproof-domains";
import { ArrowLeft } from "lucide-react";

const APP_BASE_URL = "https://aproof-demo-31cd424c.base44.app";

export default function Demo() {
  const [transcript, setTranscript] = useState([]);
  const [domainLevels, setDomainLevels] = useState({});
  const [summary, setSummary] = useState("");
  const [contextFactors, setContextFactors] = useState([]);
  const [topIcfCodes, setTopIcfCodes] = useState([]);
  const [guidelineAdvice, setGuidelineAdvice] = useState(null);
  const [voiceStatus, setVoiceStatus] = useState("Klaar om te beginnen");
  const [showClinicalReport, setShowClinicalReport] = useState(false);
  const [conversationMode, setConversationMode] = useState("leo");
  const [insightEvents, setInsightEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [debugMetrics, setDebugMetrics] = useState({
    lastTranscriptEvent: null,
    lastAnalysisRun: null,
    analysisCount: 0,
    languageFixes: 0,
    rejectedTurns: 0,
    lastRejectReason: "-",
  });

  const transcriptRef = useRef([]);
  const domainLevelsRef = useRef({});
  const nextEventId = useRef(1);

  // Append a turn to the transcript
  const handleTranscript = useCallback((entry) => {
    setTranscript((prev) => {
      const next = [...prev, entry];
      transcriptRef.current = next;
      return next;
    });
  }, []);

  const handleModeChange = useCallback((mode) => {
    if (mode === "clinical_request") {
      setConversationMode("clinical");
      setShowClinicalReport(true);
    }
  }, []);

  // Process ICF analysis response and merge into domainLevels
  const handleAnalysis = useCallback((payload) => {
    if (!payload) return;
    if (payload.no_signal) return;
    const domains = payload.domains || [];
    const factors = payload.context_factors || [];
    const topCodes = payload.top_icf_codes || [];
    const advice = payload.guideline_advice || null;

    const previous = domainLevelsRef.current;
    const next = { ...previous };
    const changedDomains = [];
    const domainMeta = Object.fromEntries(APROOF_DOMAINS.map((d) => [d.code, d]));

    for (const d of domains) {
      if (!d.code) continue;
      const normalized = {
        level: d.level,
        confidence: d.confidence,
        evidence: d.evidence || [],
        reasoning: d.reasoning || "",
      };
      next[d.code] = normalized;

      const prevDomain = previous[d.code];
      const changed =
        !prevDomain ||
        prevDomain.level !== normalized.level ||
        Math.abs((prevDomain.confidence || 0) - (normalized.confidence || 0)) > 0.01;

      if (changed) {
        changedDomains.push({
          code: d.code,
          level: normalized.level,
          confidence: normalized.confidence,
          evidence: normalized.evidence,
          maxLevel: domainMeta[d.code]?.maxLevel || d.max_level || (d.code === "d450" ? 5 : 4),
        });
      }
    }

    domainLevelsRef.current = next;
    setDomainLevels(next);

    if (changedDomains.length > 0 || topCodes.length > 0) {
      const latestTurn = [...transcriptRef.current].reverse().find((item) => item.speaker === "user") || transcriptRef.current[transcriptRef.current.length - 1];
      const event = {
        id: `evt_${nextEventId.current++}`,
        turnIndex: transcriptRef.current.length,
        speaker: latestTurn?.speaker || "system",
        speakerLabel: latestTurn?.speaker === "assistant" ? "Assistent" : latestTurn?.speaker === "user" ? "Patient" : "Systeem",
        text: latestTurn?.text || "Analyse-update",
        changedDomains,
        topCodes: Array.isArray(topCodes) ? topCodes.slice(0, 10) : [],
        lowConfidence: changedDomains.some((item) => (item.confidence || 1) < 0.55),
        timestamp: Date.now(),
      };
      setInsightEvents((prev) => [...prev, event]);
      setSelectedEventId(event.id);
    }

    if (payload.summary) setSummary(payload.summary);
    if (Array.isArray(factors) && factors.length > 0) setContextFactors(factors);
    if (Array.isArray(topCodes) && topCodes.length > 0) setTopIcfCodes(topCodes);
    if (advice) setGuidelineAdvice(advice);
  }, []);

  const resetConversation = useCallback(() => {
    setTranscript([]);
    setDomainLevels({});
    setSummary("");
    setContextFactors([]);
    setTopIcfCodes([]);
    setGuidelineAdvice(null);
    setShowClinicalReport(false);
    setConversationMode("leo");
    setInsightEvents([]);
    setSelectedEventId(null);
    setDebugMetrics({
      lastTranscriptEvent: null,
      lastAnalysisRun: null,
      analysisCount: 0,
      languageFixes: 0,
      rejectedTurns: 0,
      lastRejectReason: "-",
    });
    transcriptRef.current = [];
    domainLevelsRef.current = {};
    nextEventId.current = 1;
  }, []);

  const hasFindings = transcript.length > 0 || Object.keys(domainLevels).length > 0 || !!summary;
  const selectedEventIndex = insightEvents.findIndex((e) => e.id === selectedEventId);

  return (
    <div className="min-h-screen aproof-dashboard-bg text-foreground">
      {/* Nav bar */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <a
            href={APP_BASE_URL}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Terug
          </a>
          <h1 className="text-lg font-bold text-aproof-coral tracking-tight">
            A-PROOF Demo
          </h1>
          <div className="w-16" /> {/* spacer */}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-6">
          <DemoTopStrip
            conversationMode={conversationMode}
            voiceStatus={voiceStatus}
            hasFindings={hasFindings}
            transcriptCount={transcript.length}
            eventCount={insightEvents.length}
            debugMetrics={debugMetrics}
            onSetConversationMode={(mode) => {
              setConversationMode(mode);
              setShowClinicalReport(mode === "clinical");
            }}
            onReset={resetConversation}
            onOpenClinical={() => {
              setConversationMode("clinical");
              setShowClinicalReport(true);
            }}
          />
        </div>

        <div className="grid xl:grid-cols-[1.25fr_0.95fr] gap-6">
          {/* -------- Left column -------- */}
          <div className="space-y-6">
            {/* Voice control */}
            <Card className="aproof-panel aproof-appear">
              <CardContent className="py-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold">Spraak invoer</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tip: "Kunt u kort samenvatten voor mijn zorgverlener?"
                    </p>
                  </div>
                  <VoiceInput
                    onTranscript={handleTranscript}
                    onAnalysis={handleAnalysis}
                    onStatusChange={setVoiceStatus}
                    onModeChange={handleModeChange}
                    conversationMode={conversationMode}
                    onDebugUpdate={setDebugMetrics}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="aproof-panel aproof-appear">
              <CardContent>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Interactiekaart (live)
                </h2>
                <InteractionMap
                  events={insightEvents}
                  selectedEventId={selectedEventId}
                  onSelectEvent={setSelectedEventId}
                  topIcfCodes={topIcfCodes}
                  contextFactors={contextFactors}
                />
              </CardContent>
            </Card>

            <Card className="aproof-panel aproof-appear">
              <CardContent>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Interactie monitor
                </h2>
                <InteractionPanel
                  events={insightEvents}
                  selectedEventId={selectedEventId}
                  onSelectEvent={setSelectedEventId}
                />
              </CardContent>
            </Card>

            <Card className="aproof-panel aproof-appear">
              <CardContent>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Session timeline
                </h2>
                <SessionTimeline
                  events={insightEvents}
                  selectedIndex={selectedEventIndex}
                  onSelect={(index) => setSelectedEventId(insightEvents[index]?.id || null)}
                />
              </CardContent>
            </Card>
          </div>

          {/* -------- Right column -------- */}
          <div className="space-y-6">
            {/* Domain bars — the hero */}
            <Card className="aproof-panel aproof-appear">
              <CardContent>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  ICF-domeinen
                </h2>
                <DomainBars domainLevels={domainLevels} />
              </CardContent>
            </Card>

            {/* Evidence */}
            <Card className="aproof-panel aproof-appear">
              <CardContent>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Transcript
                </h2>
                <TranscriptPanel transcript={transcript} />
              </CardContent>
            </Card>

            <Card className="aproof-panel aproof-appear">
              <CardContent>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Sleutelwoorden
                </h2>
                <EvidencePanel domainLevels={domainLevels} />
              </CardContent>
            </Card>

            <Card className="aproof-panel aproof-appear">
              <CardContent>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Omgevingsfactoren
                </h2>
                <ContextFactorsPanel factors={contextFactors} />
              </CardContent>
            </Card>

            <Card className="aproof-panel aproof-appear">
              <CardContent>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Top 10 ICF-codes (sessie)
                </h2>
                <TopIcfCodesPanel codes={topIcfCodes} />
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Full-width clinical summary */}
        {showClinicalReport && (summary || Object.keys(domainLevels).length > 0) && (
          <Card className="aproof-panel aproof-appear mt-6">
            <CardContent>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Klinisch overzicht
              </h2>
              <ClinicalSummary domainLevels={domainLevels} summary={summary} guidelineAdvice={guidelineAdvice} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}

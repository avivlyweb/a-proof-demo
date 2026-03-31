import { useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ConversationProvider } from "@elevenlabs/react";
import VoiceInputElevenLabs from "@/components/aproof/VoiceInputElevenLabs";
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
import FeedbackPanel from "@/components/aproof/FeedbackPanel";
import { base44 } from "@/api/base44Client";
import { APROOF_DOMAINS } from "@/lib/aproof-domains";
import { ArrowLeft } from "lucide-react";

const APP_BASE_URL = "https://aproof-voice-demo.base44.app";

export default function Demo2() {
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
  const [sessionConsent, setSessionConsent] = useState(false);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackStatus, setFeedbackStatus] = useState("");

  const transcriptRef = useRef([]);
  const domainLevelsRef = useRef({});
  const nextEventId = useRef(1);
  const lastClinicalTurnRef = useRef(null);
  const lastEventSignatureRef = useRef("");
  const sessionIdRef = useRef(`sess_${Date.now()}`);
  const sessionStartedAtRef = useRef(null);
  const sessionEndedAtRef = useRef(null);

  const handleTranscript = useCallback((entry) => {
    setTranscript((prev) => {
      const next = [...prev, entry];
      transcriptRef.current = next;
      if (entry?.speaker === "user" && entry?.clinicalSignal) {
        lastClinicalTurnRef.current = {
          turnIndex: next.length,
          text: entry.text,
        };
      }
      return next;
    });
  }, []);

  const handleModeChange = useCallback((mode) => {
    if (mode === "clinical_request") {
      setConversationMode("clinical");
      setShowClinicalReport(true);
    }
  }, []);

  const handleVoiceStatusChange = useCallback((status) => {
    setVoiceStatus(status);
    if (status.startsWith("Verbonden") && !sessionStartedAtRef.current) {
      sessionStartedAtRef.current = new Date().toISOString();
      sessionEndedAtRef.current = null;
    }
    if (status === "Sessie gestopt" && sessionStartedAtRef.current) {
      sessionEndedAtRef.current = new Date().toISOString();
    }
  }, []);

  const saveSession = useCallback(async () => {
    if (!sessionConsent) {
      setSaveStatus("Geef eerst toestemming om op te slaan.");
      return;
    }
    if (transcriptRef.current.length === 0) {
      setSaveStatus("Nog geen transcript om op te slaan.");
      return;
    }

    setIsSavingSession(true);
    setSaveStatus("");
    try {
      await base44.entities.TestSession.create({
        session_id: sessionIdRef.current,
        started_at: sessionStartedAtRef.current || new Date().toISOString(),
        ended_at: sessionEndedAtRef.current || new Date().toISOString(),
        transcript: transcriptRef.current,
        domain_levels: domainLevelsRef.current,
        top_icf_codes: topIcfCodes,
        context_factors: contextFactors,
        clinical_summary: summary,
        guideline_advice: guidelineAdvice || {},
        insight_events: insightEvents,
        debug_metrics: debugMetrics,
        consent: sessionConsent,
        source: "demo2-elevenlabs",
      });
      setSaveStatus("Testsessie opgeslagen voor teamreview.");
    } catch (error) {
      console.error("Failed to save session:", error);
      setSaveStatus("Opslaan mislukt. Probeer opnieuw.");
    } finally {
      setIsSavingSession(false);
    }
  }, [contextFactors, debugMetrics, guidelineAdvice, insightEvents, sessionConsent, summary, topIcfCodes]);

  const submitFeedback = useCallback(async (payload) => {
    if (!sessionConsent) {
      setFeedbackStatus("Geef eerst toestemming om feedback op te slaan.");
      return;
    }
    setIsSubmittingFeedback(true);
    setFeedbackStatus("");
    try {
      await base44.entities.TesterFeedback.create(payload);
      setFeedbackStatus("Feedback opgeslagen. Dank u!");
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      setFeedbackStatus("Feedback opslaan mislukt.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  }, [sessionConsent]);

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
      const attributionTurn = lastClinicalTurnRef.current;
      if (!attributionTurn) return;

      const signature = JSON.stringify({
        turnIndex: attributionTurn.turnIndex,
        domains: [...changedDomains]
          .map((d) => `${d.code}:${d.level}:${Math.round((d.confidence || 0) * 100)}`)
          .sort(),
        topCodes: [...topCodes].map((d) => d.code).sort(),
      });

      if (signature === lastEventSignatureRef.current) return;
      lastEventSignatureRef.current = signature;

      const event = {
        id: `evt_${nextEventId.current++}`,
        turnIndex: attributionTurn.turnIndex,
        speaker: "user",
        speakerLabel: "Patient",
        text: attributionTurn.text || "Analyse-update",
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
    lastClinicalTurnRef.current = null;
    lastEventSignatureRef.current = "";
    sessionIdRef.current = `sess_${Date.now()}`;
    sessionStartedAtRef.current = null;
    sessionEndedAtRef.current = null;
    setSaveStatus("");
    setFeedbackStatus("");
  }, []);

  const hasFindings = transcript.length > 0 || Object.keys(domainLevels).length > 0 || !!summary;
  const selectedEventIndex = insightEvents.findIndex((e) => e.id === selectedEventId);

  return (
    <ConversationProvider>
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
            <div className="text-center">
              <h1 className="text-lg font-bold text-aproof-coral tracking-tight">
                A-PROOF Demo 2.0
              </h1>
              <span className="text-xs text-muted-foreground">
                ElevenLabs Expressive Voice · V3 Conversational
              </span>
            </div>
            <div className="w-16" />
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
              <Card className="aproof-panel aproof-appear">
                <CardContent className="py-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold">Spraak invoer</h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        1) Druk op <strong>Start gesprek</strong> 2) Spreek rustig 3) Leo helpt stap voor stap.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Voor zorgverlener: "Kunt u kort samenvatten voor mijn zorgverlener?"
                      </p>
                    </div>
                    <VoiceInputElevenLabs
                      onTranscript={handleTranscript}
                      onAnalysis={handleAnalysis}
                      onStatusChange={handleVoiceStatusChange}
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
              <Card className="aproof-panel aproof-appear">
                <CardContent>
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                    ICF-domeinen
                  </h2>
                  <DomainBars domainLevels={domainLevels} />
                </CardContent>
              </Card>

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

          <Card className="aproof-panel aproof-appear mt-6">
            <CardContent>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Team feedback
              </h2>
              <FeedbackPanel
                sessionId={sessionIdRef.current}
                consent={sessionConsent}
                onConsentChange={setSessionConsent}
                onSaveSession={saveSession}
                onSubmitFeedback={submitFeedback}
                isSavingSession={isSavingSession}
                isSubmittingFeedback={isSubmittingFeedback}
                saveStatus={saveStatus}
                feedbackStatus={feedbackStatus}
              />
            </CardContent>
          </Card>
        </main>
      </div>
    </ConversationProvider>
  );
}

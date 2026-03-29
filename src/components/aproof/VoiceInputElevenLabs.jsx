import { useState, useRef, useCallback, useEffect } from "react";
import { useConversation, useConversationStatus, useConversationMode } from "@elevenlabs/react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Mic, MicOff, Loader } from "lucide-react";

const AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID || "agent_9801kmx9sa4hfe9azpa3t7ptrdfz";

const ANALYSIS_DEBOUNCE_MS = 1500;

const CLINICAL_SUMMARY_TRIGGERS = [
  "klinische samenvatting",
  "klinisch overzicht",
  "maak rapport",
  "toon icf",
  "geef samenvatting",
  "kort samenvatten",
  "samenvatten voor zorgverlener",
];

export default function VoiceInputElevenLabs({
  onTranscript,
  onAnalysis,
  onStatusChange,
  onModeChange,
  conversationMode,
  onDebugUpdate,
}) {
  const [statusText, setStatusText] = useState("Klaar om te beginnen");

  const patientLines = useRef([]);
  const lastAnalyzedText = useRef("");
  const analysisTimer = useRef(null);
  const debugMetricsRef = useRef({
    lastTranscriptEvent: null,
    lastAnalysisRun: null,
    analysisCount: 0,
    languageFixes: 0,
    rejectedTurns: 0,
    lastRejectReason: "-",
  });
  const lastProcessedMessage = useRef("");
  const conversationModeRef = useRef(conversationMode);

  // Keep ref in sync
  useEffect(() => {
    conversationModeRef.current = conversationMode;
  }, [conversationMode]);

  const log = useCallback(
    (msg) => {
      setStatusText(msg);
      onStatusChange?.(msg);
    },
    [onStatusChange]
  );

  const publishDebug = useCallback(
    (partial) => {
      debugMetricsRef.current = { ...debugMetricsRef.current, ...partial };
      onDebugUpdate?.({ ...debugMetricsRef.current });
    },
    [onDebugUpdate]
  );

  // ── ICF analysis ──────────────────────────────────────────────
  const scheduleAnalysis = useCallback(() => {
    if (analysisTimer.current) clearTimeout(analysisTimer.current);
    analysisTimer.current = setTimeout(async () => {
      const text = patientLines.current.join("\n").trim();
      if (!text || text === lastAnalyzedText.current) return;
      lastAnalyzedText.current = text;

      try {
        const res = await base44.functions.invoke("analyzeIcfDomains", {
          conversationText: text,
          recentTranscript: patientLines.current.slice(-4).join("\n"),
        });
        const payload = res?.data?.data || res?.data;
        if (payload) {
          onAnalysis?.(payload);
          publishDebug({
            lastAnalysisRun: Date.now(),
            analysisCount: (debugMetricsRef.current.analysisCount || 0) + 1,
          });
        }
      } catch (err) {
        console.warn("ICF analysis failed:", err);
      }
    }, ANALYSIS_DEBOUNCE_MS);
  }, [onAnalysis, publishDebug]);

  // ── Clinical mode detection ───────────────────────────────────
  const checkClinicalTrigger = useCallback(
    (text) => {
      const lower = (text || "").toLowerCase();
      if (CLINICAL_SUMMARY_TRIGGERS.some((t) => lower.includes(t))) {
        onModeChange?.("clinical_request");
      }
    },
    [onModeChange]
  );

  // ── Stable refs for callbacks ─────────────────────────────────
  const onTranscriptRef = useRef(onTranscript);
  const onAnalysisRef = useRef(onAnalysis);
  const scheduleAnalysisRef = useRef(scheduleAnalysis);
  const checkClinicalTriggerRef = useRef(checkClinicalTrigger);

  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onAnalysisRef.current = onAnalysis; }, [onAnalysis]);
  useEffect(() => { scheduleAnalysisRef.current = scheduleAnalysis; }, [scheduleAnalysis]);
  useEffect(() => { checkClinicalTriggerRef.current = checkClinicalTrigger; }, [checkClinicalTrigger]);

  // ── Process a transcript message ──────────────────────────────
  const processMessage = useCallback((message, source) => {
    if (!message) return;
    const text = message.trim();
    if (!text) return;

    // Dedupe
    const key = `${source}:${text}`;
    if (key === lastProcessedMessage.current) return;
    lastProcessedMessage.current = key;

    console.log(`[ElevenLabs] ${source}: ${text}`);

    if (source === "user") {
      patientLines.current.push(text);
      onTranscriptRef.current?.({
        speaker: "user",
        text,
        source: "elevenlabs",
        clinicalSignal: true,
        timestamp: Date.now(),
      });
      publishDebug({ lastTranscriptEvent: Date.now() });
      checkClinicalTriggerRef.current?.(text);
      if (conversationModeRef.current !== "clinical") {
        scheduleAnalysisRef.current?.();
      }
    } else if (source === "ai") {
      onTranscriptRef.current?.({
        speaker: "assistant",
        text,
        source: "elevenlabs",
        timestamp: Date.now(),
      });
    }
  }, [publishDebug]);

  // ── ElevenLabs conversation hook ──────────────────────────────
  const conversation = useConversation({
    onConnect: () => {
      console.log("[ElevenLabs] Connected");
      log("Verbonden — spreek nu");
    },
    onDisconnect: () => {
      console.log("[ElevenLabs] Disconnected");
      log("Sessie gestopt");
    },
    onError: (error) => {
      console.error("[ElevenLabs] Error:", error);
      log("Fout: verbinding verbroken");
    },
    onMessage: (payload) => {
      console.log("[ElevenLabs] onMessage:", payload);
      if (payload?.message) {
        processMessage(payload.message, payload.source || payload.role);
      }
    },
    onModeChange: ({ mode }) => {
      console.log("[ElevenLabs] Mode:", mode);
    },
    onStatusChange: (payload) => {
      console.log("[ElevenLabs] Status:", payload);
    },
  });

  const { status } = useConversationStatus();
  const { isSpeaking } = useConversationMode();
  const isActive = status === "connected";
  const isConnecting = status === "connecting";

  // Also watch the reactive `message` property as a fallback
  useEffect(() => {
    if (conversation.message) {
      console.log("[ElevenLabs] Reactive message:", conversation.message);
    }
  }, [conversation.message]);

  // ── Start / Stop ──────────────────────────────────────────────
  const startSession = useCallback(() => {
    if (isActive || isConnecting) return;
    log("Verbinden met Leo...");

    try {
      conversation.startSession({ agentId: AGENT_ID });
    } catch (err) {
      console.error("[ElevenLabs] startSession error:", err);
      log(`Fout: ${err.message || "verbinding mislukt"}`);
    }
  }, [conversation, isActive, isConnecting, log]);

  const stopSession = useCallback(() => {
    try {
      conversation.endSession();
    } catch (err) {
      console.error("[ElevenLabs] endSession error:", err);
    }
    if (analysisTimer.current) clearTimeout(analysisTimer.current);
    // Run final analysis with all accumulated text
    const text = patientLines.current.join("\n").trim();
    if (text && text !== lastAnalyzedText.current) {
      lastAnalyzedText.current = text;
      base44.functions.invoke("analyzeIcfDomains", {
        conversationText: text,
        recentTranscript: patientLines.current.slice(-4).join("\n"),
      }).then((res) => {
        const payload = res?.data?.data || res?.data;
        if (payload) onAnalysisRef.current?.(payload);
      }).catch((err) => console.warn("Final ICF analysis failed:", err));
    }
    log("Sessie gestopt");
  }, [conversation, log]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (analysisTimer.current) clearTimeout(analysisTimer.current);
    };
  }, []);

  return (
    <div className="w-full flex flex-col items-center gap-3">
      <Button
        onClick={isActive ? stopSession : startSession}
        disabled={isConnecting}
        className={`h-14 min-w-[220px] rounded-full text-base font-semibold shadow-lg transition-all ${
          isActive
            ? "bg-aproof-coral hover:bg-aproof-coral/80"
            : "bg-aproof-teal hover:bg-aproof-teal/80"
        }`}
      >
        {isConnecting ? (
          <>
            <Loader className="w-5 h-5 text-white animate-spin mr-2" />
            Verbinden...
          </>
        ) : isActive ? (
          <>
            <MicOff className="w-5 h-5 text-white mr-2" />
            Stop gesprek
          </>
        ) : (
          <>
            <Mic className="w-5 h-5 text-white mr-2" />
            Start gesprek
          </>
        )}
      </Button>

      <p className="text-sm text-muted-foreground text-center max-w-md">
        Druk op{" "}
        <span className="font-medium text-foreground">Start gesprek</span> en
        spreek rustig. Leo begint met een korte begroeting in het Nederlands.
      </p>

      {isSpeaking && (
        <span className="text-xs text-aproof-teal animate-pulse">Leo spreekt...</span>
      )}

      <span className="text-xs text-muted-foreground text-center">{statusText}</span>
    </div>
  );
}

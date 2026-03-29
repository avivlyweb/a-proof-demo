import { useState, useRef, useCallback, useEffect } from "react";
import { useConversation } from "@elevenlabs/react";
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
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState("Klaar om te beginnen");

  const patientLines = useRef([]);
  const lastAnalyzedText = useRef("");
  const analysisTimer = useRef(null);
  const debugMetrics = useRef({
    lastTranscriptEvent: null,
    lastAnalysisRun: null,
    analysisCount: 0,
    languageFixes: 0,
    rejectedTurns: 0,
    lastRejectReason: "-",
  });

  const log = useCallback(
    (msg) => {
      setStatus(msg);
      onStatusChange?.(msg);
    },
    [onStatusChange]
  );

  const publishDebug = useCallback(
    (partial) => {
      debugMetrics.current = { ...debugMetrics.current, ...partial };
      onDebugUpdate?.(debugMetrics.current);
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
            analysisCount: (debugMetrics.current.analysisCount || 0) + 1,
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

  // ── ElevenLabs conversation hook ──────────────────────────────
  const conversation = useConversation({
    onConnect: () => {
      log("Verbonden — spreek nu");
    },
    onDisconnect: () => {
      log("Sessie gestopt");
    },
    onError: (error) => {
      console.error("ElevenLabs error:", error);
      log("Fout: verbinding verbroken");
    },
    onMessage: ({ message, source }) => {
      if (!message) return;

      if (source === "user") {
        const text = message.trim();
        if (!text) return;
        patientLines.current.push(text);
        onTranscript?.({
          speaker: "user",
          text,
          source: "elevenlabs",
          clinicalSignal: true,
          timestamp: Date.now(),
        });
        publishDebug({ lastTranscriptEvent: Date.now() });
        checkClinicalTrigger(text);
        if (conversationMode !== "clinical") {
          scheduleAnalysis();
        }
      }

      if (source === "ai") {
        const text = message.trim();
        if (!text) return;
        onTranscript?.({
          speaker: "assistant",
          text,
          source: "elevenlabs",
          timestamp: Date.now(),
        });
      }
    },
  });

  const isActive = conversation.status === "connected";

  // ── Start / Stop ──────────────────────────────────────────────
  const startSession = useCallback(async () => {
    if (isActive || isConnecting) return;
    setIsConnecting(true);
    log("Verbinden met Leo...");

    try {
      await conversation.startSession({ agentId: AGENT_ID });
      setIsConnecting(false);
    } catch (err) {
      console.error("startSession error:", err);
      log(`Fout: ${err.message || "verbinding mislukt"}`);
      setIsConnecting(false);
    }
  }, [conversation, isActive, isConnecting, log]);

  const stopSession = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (err) {
      console.error("endSession error:", err);
    }
    if (analysisTimer.current) clearTimeout(analysisTimer.current);
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

      {conversation.isSpeaking && (
        <span className="text-xs text-aproof-teal animate-pulse">Leo spreekt...</span>
      )}

      <span className="text-xs text-muted-foreground text-center">{status}</span>
    </div>
  );
}

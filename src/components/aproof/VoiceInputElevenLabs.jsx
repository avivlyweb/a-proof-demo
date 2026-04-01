import { useState, useRef, useCallback, useEffect } from "react";
import { useConversation, useConversationStatus, useConversationMode } from "@elevenlabs/react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Mic, MicOff, Loader } from "lucide-react";

const DEFAULT_AGENT_ID = import.meta.env.VITE_ELEVENLABS_AGENT_ID || "agent_9801kmx9sa4hfe9azpa3t7ptrdfz";

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
  agentId,
  onTranscript,
  onAnalysis,
  onStatusChange,
  onModeChange,
  conversationMode,
  onDebugUpdate,
}) {
  const AGENT_ID = agentId || DEFAULT_AGENT_ID;
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

  // Store callbacks in refs so they're always fresh in onMessage
  const callbackRefs = useRef({ onTranscript, onAnalysis, onStatusChange, onModeChange, onDebugUpdate });
  callbackRefs.current = { onTranscript, onAnalysis, onStatusChange, onModeChange, onDebugUpdate };

  const conversationModeRef = useRef(conversationMode);
  conversationModeRef.current = conversationMode;

  const log = useCallback((msg) => {
    setStatusText(msg);
    callbackRefs.current.onStatusChange?.(msg);
  }, []);

  // ── Run ICF analysis ──────────────────────────────────────────
  const runAnalysis = useCallback(async () => {
    const text = patientLines.current.join("\n").trim();
    if (!text || text === lastAnalyzedText.current) return;
    lastAnalyzedText.current = text;

    console.log("[ElevenLabs] Running ICF analysis on:", text.substring(0, 100) + "...");

    try {
      const res = await base44.functions.invoke("analyzeIcfDomains", {
        conversationText: text,
        recentTranscript: patientLines.current.slice(-4).join("\n"),
      });

      console.log("[ElevenLabs] Analysis response:", res);

      const payload = res?.data?.data || res?.data;
      if (payload) {
        console.log("[ElevenLabs] Analysis payload domains:", payload.domains?.length, payload.domains);
        callbackRefs.current.onAnalysis?.(payload);
        debugMetricsRef.current = {
          ...debugMetricsRef.current,
          lastAnalysisRun: Date.now(),
          analysisCount: (debugMetricsRef.current.analysisCount || 0) + 1,
        };
        callbackRefs.current.onDebugUpdate?.({ ...debugMetricsRef.current });
      } else {
        console.warn("[ElevenLabs] Analysis returned no payload:", res);
      }
    } catch (err) {
      console.error("[ElevenLabs] ICF analysis failed:", err);
    }
  }, []);

  const scheduleAnalysis = useCallback(() => {
    if (analysisTimer.current) clearTimeout(analysisTimer.current);
    analysisTimer.current = setTimeout(runAnalysis, ANALYSIS_DEBOUNCE_MS);
  }, [runAnalysis]);

  // ── ElevenLabs conversation hook ──────────────────────────────
  const conversation = useConversation({
    onConnect: () => {
      console.log("[ElevenLabs] Connected");
      log("Verbonden — spreek nu");
    },
    onDisconnect: () => {
      console.log("[ElevenLabs] Disconnected");
      // Run final analysis
      runAnalysis();
      log("Sessie gestopt");
    },
    onError: (error) => {
      console.error("[ElevenLabs] Error:", error);
      log("Fout: verbinding verbroken");
    },
    onMessage: (payload) => {
      console.log("[ElevenLabs] onMessage:", JSON.stringify(payload));

      const message = payload?.message;
      if (!message) return;
      const text = message.trim();
      if (!text) return;

      // source is deprecated, role is the new field
      const role = payload.source || payload.role;

      // Dedupe
      const key = `${role}:${text}`;
      if (key === lastProcessedMessage.current) return;
      lastProcessedMessage.current = key;

      console.log(`[ElevenLabs] Processing ${role}: ${text}`);

      if (role === "user") {
        patientLines.current.push(text);

        callbackRefs.current.onTranscript?.({
          speaker: "user",
          text,
          source: "elevenlabs",
          clinicalSignal: true,
          timestamp: Date.now(),
        });

        debugMetricsRef.current = {
          ...debugMetricsRef.current,
          lastTranscriptEvent: Date.now(),
        };
        callbackRefs.current.onDebugUpdate?.({ ...debugMetricsRef.current });

        // Check for clinical summary triggers
        const lower = text.toLowerCase();
        if (CLINICAL_SUMMARY_TRIGGERS.some((t) => lower.includes(t))) {
          callbackRefs.current.onModeChange?.("clinical_request");
        }

        // Schedule ICF analysis
        if (conversationModeRef.current !== "clinical") {
          console.log("[ElevenLabs] Scheduling analysis, patient lines:", patientLines.current.length);
          scheduleAnalysis();
        }
      } else {
        // AI/agent response
        callbackRefs.current.onTranscript?.({
          speaker: "assistant",
          text,
          source: "elevenlabs",
          timestamp: Date.now(),
        });
      }
    },
  });

  const { status } = useConversationStatus();
  const { isSpeaking } = useConversationMode();
  const isActive = status === "connected";
  const isConnecting = status === "connecting";

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
    runAnalysis();
    log("Sessie gestopt");
  }, [conversation, log, runAnalysis]);

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

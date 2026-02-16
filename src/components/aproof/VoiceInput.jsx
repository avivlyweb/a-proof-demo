import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { LEO_SYSTEM_PROMPT } from "@/lib/leo-system-prompt";
import { Mic, MicOff, Loader } from "lucide-react";

const REALTIME_MODEL = "gpt-realtime";

const CLINICAL_SUMMARY_TRIGGERS = [
  "klinische samenvatting",
  "klinisch overzicht",
  "maak rapport",
  "genereer rapport",
  "toon icf",
  "geef samenvatting",
  "kort samenvatten",
  "samenvatten voor zorgverlener",
  "samenvatting voor mijn arts",
  "samenvatting voor de fysio",
  "wat zijn de bevindingen",
  "wat is de conclusie",
];

const INTERNAL_CONTROL_SNIPPETS = [
  "herformuleer je vorige antwoord volledig in eenvoudig nederlands",
  "je spreekt nu met de zorgverlener",
  "format:",
  "patiënt-input uit deze sessie",
];

const FILLER_TOKENS = new Set([
  "uh",
  "eh",
  "hmm",
  "hm",
  "mmm",
  "kuch",
  "kuchen",
  "hoest",
  "hoesten",
  "cough",
]);

const META_NON_CLINICAL_PATTERNS = [
  "hoe heet je",
  "wat is jouw rol",
  "wat doe je",
  "wie ben je",
  "wat kun je",
  "waar kan ik je voor gebruiken",
];

const NON_DUTCH_MARKERS = [
  "hola",
  "buenos",
  "gracias",
  "por favor",
  "como estas",
  "hello",
  "how are you",
  "i can help",
];

function extractTextFromMessageItem(item) {
  if (!item || item.type !== "message" || !Array.isArray(item.content)) return "";

  const parts = [];
  for (const block of item.content) {
    if (typeof block?.text === "string" && block.text.trim()) parts.push(block.text.trim());
    if (typeof block?.transcript === "string" && block.transcript.trim()) parts.push(block.transcript.trim());
  }

  return parts.join(" ").trim();
}

function normalizeForLanguageCheck(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-zA-Z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isLikelyDutch(text) {
  const normalized = normalizeForLanguageCheck(text);
  if (!normalized) return true;

  if (NON_DUTCH_MARKERS.some((marker) => normalized.includes(marker))) return false;

  const dutchMarkers = [
    "de", "het", "een", "en", "ik", "u", "jij", "niet", "wel", "dat", "met", "voor", "van", "hoe", "gaat", "kunt", "heeft", "hebt", "fijn", "vandaag", "voelt", "lopen", "energie", "goedemorgen", "nederlands", "gesprek", "zorgverlener",
  ];
  const tokens = normalized.split(" ");
  const markerHits = tokens.filter((t) => dutchMarkers.includes(t)).length;
  return markerHits >= 3 || markerHits / Math.max(tokens.length, 1) >= 0.2;
}

function isClinicalSummaryTrigger(text) {
  const normalized = normalizeForLanguageCheck(text);
  if (CLINICAL_SUMMARY_TRIGGERS.some((phrase) => normalized.includes(phrase))) return true;

  const askWords = ["kun", "kan", "wil", "graag", "mag", "zou"];
  const summaryWords = ["samenvatting", "overzicht", "rapport", "conclusie", "bevindingen", "analyse"];
  const clinicalAudienceWords = ["zorgverlener", "arts", "fysio", "verpleegkundige", "behandelaar", "therapeut"];

  const hasAskWord = askWords.some((word) => normalized.includes(word));
  const hasSummaryWord = summaryWords.some((word) => normalized.includes(word));
  const hasClinicalAudienceWord = clinicalAudienceWords.some((word) => normalized.includes(word));

  return (hasAskWord && hasSummaryWord) || (hasSummaryWord && hasClinicalAudienceWord);
}

function isInternalControlText(text) {
  const normalized = normalizeForLanguageCheck(text);
  return INTERNAL_CONTROL_SNIPPETS.some((snippet) => normalized.includes(snippet));
}

function isUsablePatientUtterance(text) {
  const normalized = normalizeForLanguageCheck(text);
  if (!normalized) return { valid: false, reason: "empty" };
  if (isInternalControlText(normalized)) return { valid: false, reason: "internal_control" };
  if (META_NON_CLINICAL_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    return { valid: false, reason: "meta_non_clinical" };
  }

  const tokens = normalized.split(" ").filter(Boolean);
  if (tokens.length < 3) {
    const allFillers = tokens.every((t) => FILLER_TOKENS.has(t));
    if (allFillers || tokens.length <= 1) return { valid: false, reason: "too_short_or_noise" };
  }

  const lexicalTokens = tokens.filter((t) => !FILLER_TOKENS.has(t));
  if (lexicalTokens.length < 2) return { valid: false, reason: "noise" };

  return { valid: true, reason: "ok" };
}

function isRoleDriftedAssistant(text) {
  const normalized = normalizeForLanguageCheck(text);
  const driftPatterns = [
    "ik kan van alles",
    "digitale kompaan",
    "ik kan je helpen met praktische tips",
    "ik kan informatie opzoeken",
    "ik ben een soort slimme assistent",
  ];
  return driftPatterns.some((pattern) => normalized.includes(pattern));
}

export default function VoiceInput({
  onTranscript,
  onAnalysis,
  onStatusChange,
  onModeChange,
  onDebugUpdate,
  conversationMode = "leo",
}) {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState("Klaar om te beginnen");

  const sessionRef = useRef(null);
  const listenerCleanupRef = useRef([]);
  const analysisTimer = useRef(null);
  const disconnectTimer = useRef(null);
  const speechRecognition = useRef(null);

  const accumulatedText = useRef("");
  const patientTranscriptLines = useRef([]);
  const lastAnalyzedText = useRef("");
  const lastUserUtterance = useRef("");
  const lastUserUtteranceAt = useRef(0);
  const seenUserItems = useRef(new Set());
  const seenAssistantItems = useRef(new Set());
  const processedHistoryItems = useRef(new Set());
  const modeRef = useRef(conversationMode);
  const debugMetricsRef = useRef({
    lastTranscriptEvent: null,
    lastAnalysisRun: null,
    analysisCount: 0,
    languageFixes: 0,
    rejectedTurns: 0,
    lastRejectReason: "-",
  });
  const internalMessagesRef = useRef(new Set());

  useEffect(() => {
    modeRef.current = conversationMode;
  }, [conversationMode]);

  const publishDebug = useCallback(
    (patch) => {
      debugMetricsRef.current = { ...debugMetricsRef.current, ...patch };
      onDebugUpdate?.(debugMetricsRef.current);
    },
    [onDebugUpdate]
  );

  const log = useCallback(
    (msg) => {
      setStatus(msg);
      onStatusChange?.(msg);
    },
    [onStatusChange]
  );

  const cleanupListeners = useCallback(() => {
    for (const cleanup of listenerCleanupRef.current) {
      try {
        cleanup();
      } catch {
        // no-op
      }
    }
    listenerCleanupRef.current = [];
  }, []);

  const scheduleAnalysis = useCallback(() => {
    if (analysisTimer.current) clearTimeout(analysisTimer.current);
    analysisTimer.current = setTimeout(async () => {
      const text = patientTranscriptLines.current.join("\n").trim();
      if (!text || text === lastAnalyzedText.current) return;
      lastAnalyzedText.current = text;

      try {
        const res = await base44.functions.invoke("analyzeIcfDomains", {
          conversationText: text,
          recentTranscript: patientTranscriptLines.current.slice(-4).join("\n"),
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
        log("ICF-analyse tijdelijk niet beschikbaar");
      }
    }, 1300);
  }, [log, onAnalysis, publishDebug]);

  const sendInternalMessage = useCallback((session, text) => {
    if (!session || !text) return;
    internalMessagesRef.current.add(normalizeForLanguageCheck(text));
    session.sendMessage(text);
  }, []);

  const injectClinicalContextPrompt = useCallback(() => {
    const patientContext = patientTranscriptLines.current.slice(-12).join("\n").trim();
    if (!patientContext || !sessionRef.current) return;

    sendInternalMessage(
      sessionRef.current,
      `Je spreekt nu met de zorgverlener. Geef een korte klinische update op basis van ALLEEN deze sessie.

Patiënt-input uit deze sessie:
${patientContext}

Format:
1) Patiëntperspectief (1-2 zinnen)
2) Waarschijnlijke ICF/FAC bevindingen (compact)
3) KNGF/Richtlijn 2025 advies (concreet, kort, met risico-inschatting)
4) Wat nog onduidelijk is [verify with clinician]

Blijf in eenvoudig Nederlands.`
    );
  }, [sendInternalMessage]);

  const appendUserTranscript = useCallback(
    (text, source = "realtime") => {
      const normalized = text?.trim();
      if (!normalized) return;

      const normalizedControl = normalizeForLanguageCheck(normalized);
      if (internalMessagesRef.current.has(normalizedControl) || isInternalControlText(normalized)) {
        publishDebug({
          rejectedTurns: (debugMetricsRef.current.rejectedTurns || 0) + 1,
          lastRejectReason: "internal_control",
        });
        return;
      }

      const now = Date.now();
      const isDuplicate =
        normalized.toLowerCase() === lastUserUtterance.current.toLowerCase() &&
        now - lastUserUtteranceAt.current < 4000;

      if (isDuplicate) return;

      lastUserUtterance.current = normalized;
      lastUserUtteranceAt.current = now;

      const isClinicalTrigger = isClinicalSummaryTrigger(normalized);
      const isClinicalMode = modeRef.current === "clinical";
      const utteranceCheck = isUsablePatientUtterance(normalized);

      if (!utteranceCheck.valid && !isClinicalTrigger && !isClinicalMode) {
        publishDebug({
          rejectedTurns: (debugMetricsRef.current.rejectedTurns || 0) + 1,
          lastRejectReason: utteranceCheck.reason,
        });
        return;
      }

      if (!isClinicalMode && !isClinicalTrigger) {
        patientTranscriptLines.current.push(normalized);
        if (patientTranscriptLines.current.length > 30) {
          patientTranscriptLines.current = patientTranscriptLines.current.slice(-30);
        }
      }

      accumulatedText.current += `\nPatient: ${normalized}`;
      onTranscript?.({ speaker: "user", text: normalized, source });

      publishDebug({ lastTranscriptEvent: Date.now() });

      if (isClinicalTrigger) {
        onModeChange?.("clinical_request", normalized);
        injectClinicalContextPrompt();
        return;
      }

      if (!isClinicalMode) scheduleAnalysis();
    },
    [injectClinicalContextPrompt, onModeChange, onTranscript, publishDebug, scheduleAnalysis]
  );

  const appendAssistantTranscript = useCallback(
    (text, session) => {
      const normalized = text?.trim();
      if (!normalized) return;

      if (!isLikelyDutch(normalized)) {
        console.warn("Assistant language drift detected:", normalized);
        log("Taal gecorrigeerd naar Nederlands...");
        publishDebug({ languageFixes: (debugMetricsRef.current.languageFixes || 0) + 1 });
        sendInternalMessage(
          session,
          "Herformuleer je vorige antwoord volledig in eenvoudig Nederlands. Gebruik korte zinnen en stel daarna 1 vriendelijke vervolgvraag."
        );
        return;
      }

      if (isRoleDriftedAssistant(normalized)) {
        log("Rol gecorrigeerd naar A-PROOF modus...");
        sendInternalMessage(
          session,
          "Blijf strikt in A-PROOF rol: warme gesprekspartner voor ouderen of klinische analist op verzoek. Vermijd algemene AI-capaciteiten. Reageer opnieuw in 1-2 korte Nederlandse zinnen."
        );
        return;
      }

      accumulatedText.current += `\nAssistent: ${normalized}`;
      onTranscript?.({ speaker: "assistant", text: normalized, source: "realtime" });
      log("Klaar om te luisteren");
    },
    [log, onTranscript, publishDebug, sendInternalMessage]
  );

  const startSpeechRecognitionFallback = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || speechRecognition.current) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "nl-NL";
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result.isFinal) appendUserTranscript(result[0]?.transcript || "", "browser_fallback");
        }
      };
      recognition.onerror = (event) => {
        if (event?.error !== "no-speech" && event?.error !== "aborted") {
          console.warn("Speech recognition error:", event.error);
        }
      };
      recognition.onend = () => {
        if (sessionRef.current) {
          try {
            recognition.start();
          } catch {
            // ignored
          }
        }
      };
      recognition.start();
      speechRecognition.current = recognition;
    } catch (error) {
      console.warn("Speech recognition fallback unavailable:", error);
    }
  }, [appendUserTranscript]);

  const stopSpeechRecognitionFallback = useCallback(() => {
    if (!speechRecognition.current) return;
    speechRecognition.current.onresult = null;
    speechRecognition.current.onerror = null;
    speechRecognition.current.onend = null;
    speechRecognition.current.stop();
    speechRecognition.current = null;
  }, []);

  const stopSession = useCallback(() => {
    if (analysisTimer.current) clearTimeout(analysisTimer.current);
    if (disconnectTimer.current) {
      clearTimeout(disconnectTimer.current);
      disconnectTimer.current = null;
    }

    stopSpeechRecognitionFallback();
    cleanupListeners();

    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch {
        // no-op
      }
      sessionRef.current = null;
    }

    setIsActive(false);
    setIsConnecting(false);
    log("Sessie gestopt");
  }, [cleanupListeners, log, stopSpeechRecognitionFallback]);

  const startSession = useCallback(async () => {
    if (sessionRef.current) return;
    setIsConnecting(true);

    accumulatedText.current = "";
    patientTranscriptLines.current = [];
    lastAnalyzedText.current = "";
    lastUserUtterance.current = "";
    lastUserUtteranceAt.current = 0;
    seenUserItems.current = new Set();
    seenAssistantItems.current = new Set();
    processedHistoryItems.current = new Set();
    internalMessagesRef.current = new Set();

    try {
      const { RealtimeAgent, RealtimeSession } = await import("@openai/agents-realtime");

      log("Sessie token aanvragen...");
      const response = await base44.functions.invoke("createOpenAISession");
      const ephemeralKey = response?.data?.value || response?.data?.client_secret?.value;
      if (!ephemeralKey) throw new Error("Geen sessie token ontvangen");

      const agent = new RealtimeAgent({
        name: "Leo",
        instructions: LEO_SYSTEM_PROMPT,
        voice: "alloy",
      });

      const session = new RealtimeSession(agent, {
        transport: "webrtc",
        model: REALTIME_MODEL,
        config: {
          outputModalities: ["audio", "text"],
          audio: {
            input: {
              transcription: {
                model: "gpt-4o-mini-transcribe",
                language: "nl",
                prompt: "De spreker gebruikt Nederlands (nl-NL).",
              },
              turnDetection: {
                type: "server_vad",
                threshold: 0.5,
                prefixPaddingMs: 300,
                silenceDurationMs: 1200,
              },
            },
            output: {
              voice: "alloy",
            },
          },
          toolChoice: "none",
          tools: [],
        },
      });

      const processRealtimeMessage = (item) => {
        if (!item || item.type !== "message") return;
        if (processedHistoryItems.current.has(item.itemId)) return;

        const text = extractTextFromMessageItem(item);
        if (!text) return;

        if (item.role === "user") {
          seenUserItems.current.add(item.itemId);
          processedHistoryItems.current.add(item.itemId);
          appendUserTranscript(text, "realtime_history");
          return;
        }

        if (item.role === "assistant") {
          seenAssistantItems.current.add(item.itemId);
          processedHistoryItems.current.add(item.itemId);
          appendAssistantTranscript(text, session);
        }
      };

      const onHistoryAdded = (item) => {
        processRealtimeMessage(item);
      };

      const onHistoryUpdated = (history) => {
        if (!Array.isArray(history)) return;
        history.forEach(processRealtimeMessage);
      };

      const onTransportEvent = (event) => {
        switch (event?.type) {
          case "input_audio_buffer.speech_started":
            log("Ik luister...");
            break;
          case "input_audio_buffer.speech_stopped":
            log("Een ogenblikje...");
            break;
          case "conversation.item.input_audio_transcription.completed": {
            const itemId = event?.item_id;
            if (itemId && seenUserItems.current.has(itemId)) break;
            if (itemId) seenUserItems.current.add(itemId);
            appendUserTranscript(event?.transcript || "", "realtime_transport");
            publishDebug({ lastTranscriptEvent: Date.now() });
            break;
          }
          case "input_audio_transcription.completed":
            appendUserTranscript(event?.transcript || "", "realtime_transport");
            break;
          case "conversation.item.input_audio_transcription.failed":
            console.warn("Audio transcription failed:", event);
            break;
          case "error":
            console.error("Realtime transport error:", event);
            log("Fout: realtime verbinding");
            break;
          default:
            break;
        }
      };

      const onSessionError = (event) => {
        console.error("Realtime session error:", event?.error || event);
      };

      const onConnectionChange = (connectionState) => {
        if (connectionState === "connected") {
          if (disconnectTimer.current) clearTimeout(disconnectTimer.current);
          disconnectTimer.current = null;
          return;
        }

        if (connectionState === "disconnected") {
          log("Verbinding tijdelijk verbroken...");
          if (disconnectTimer.current) clearTimeout(disconnectTimer.current);
          disconnectTimer.current = setTimeout(() => {
            if (sessionRef.current === session) stopSession();
          }, 5000);
        }
      };

      session.on("history_added", onHistoryAdded);
      session.on("history_updated", onHistoryUpdated);
      session.on("transport_event", onTransportEvent);
      session.on("error", onSessionError);
      session.transport.on("connection_change", onConnectionChange);

      listenerCleanupRef.current.push(
        () => session.off("history_added", onHistoryAdded),
        () => session.off("history_updated", onHistoryUpdated),
        () => session.off("transport_event", onTransportEvent),
        () => session.off("error", onSessionError),
        () => session.transport.off("connection_change", onConnectionChange)
      );

      sessionRef.current = session;

      log("WebRTC verbinding opstarten...");
      await session.connect({ apiKey: ephemeralKey, model: REALTIME_MODEL });

      setIsActive(true);
      setIsConnecting(false);
      log("Verbonden — spreek nu");
      startSpeechRecognitionFallback();
    } catch (err) {
      console.error("startSession error:", err);
      log(`Fout: ${err.message || "verbinding mislukt"}`);
      stopSession();
    }
  }, [
    appendAssistantTranscript,
    appendUserTranscript,
    cleanupListeners,
    log,
    publishDebug,
    startSpeechRecognitionFallback,
    stopSession,
  ]);

  useEffect(() => {
    return () => {
      if (sessionRef.current) stopSession();
    };
  }, [stopSession]);

  return (
    <div className="flex flex-col items-center gap-4">
      <Button
        onClick={isActive ? stopSession : startSession}
        disabled={isConnecting}
        className={`h-16 w-16 rounded-full shadow-lg transition-all ${
          isActive
            ? "bg-aproof-coral hover:bg-aproof-coral/80 animate-pulse"
            : "bg-aproof-teal hover:bg-aproof-teal/80"
        }`}
      >
        {isConnecting ? (
          <Loader className="w-7 h-7 text-white animate-spin" />
        ) : isActive ? (
          <MicOff className="w-7 h-7 text-white" />
        ) : (
          <Mic className="w-7 h-7 text-white" />
        )}
      </Button>
      <span className="text-xs text-muted-foreground text-center">{status}</span>
    </div>
  );
}

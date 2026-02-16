import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { LEO_SYSTEM_PROMPT } from "@/lib/leo-system-prompt";
import { Mic, MicOff, Loader } from "lucide-react";

const REALTIME_MODEL = "gpt-realtime";

function extractTextFromMessageItem(item) {
  if (!item || item.type !== "message" || !Array.isArray(item.content)) return "";

  const parts = [];
  for (const block of item.content) {
    if (typeof block?.text === "string" && block.text.trim()) parts.push(block.text.trim());
    if (typeof block?.transcript === "string" && block.transcript.trim()) parts.push(block.transcript.trim());
  }

  return parts.join(" ").trim();
}

export default function VoiceInput({ onTranscript, onAnalysis, onStatusChange }) {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState("Klaar om te beginnen");

  const sessionRef = useRef(null);
  const listenerCleanupRef = useRef([]);
  const analysisTimer = useRef(null);
  const disconnectTimer = useRef(null);
  const speechRecognition = useRef(null);

  const accumulatedText = useRef("");
  const userTranscriptLines = useRef([]);
  const lastAnalyzedText = useRef("");
  const lastUserUtterance = useRef("");
  const lastUserUtteranceAt = useRef(0);
  const seenUserItems = useRef(new Set());
  const seenAssistantItems = useRef(new Set());

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
      const text = userTranscriptLines.current.join("\n").trim();
      if (!text || text === lastAnalyzedText.current) return;
      lastAnalyzedText.current = text;

      try {
        const res = await base44.functions.invoke("analyzeIcfDomains", {
          conversationText: text,
          recentTranscript: userTranscriptLines.current.slice(-4).join("\n"),
        });

        const payload = res?.data?.data || res?.data;
        if (payload) onAnalysis?.(payload);
      } catch (err) {
        console.warn("ICF analysis failed:", err);
      }
    }, 1800);
  }, [onAnalysis]);

  const appendUserTranscript = useCallback(
    (text) => {
      const normalized = text?.trim();
      if (!normalized) return;

      const now = Date.now();
      const isDuplicate =
        normalized.toLowerCase() === lastUserUtterance.current.toLowerCase() &&
        now - lastUserUtteranceAt.current < 4000;

      if (isDuplicate) return;

      lastUserUtterance.current = normalized;
      lastUserUtteranceAt.current = now;

      userTranscriptLines.current.push(normalized);
      if (userTranscriptLines.current.length > 30) {
        userTranscriptLines.current = userTranscriptLines.current.slice(-30);
      }

      accumulatedText.current += `\nPatient: ${normalized}`;
      onTranscript?.({ speaker: "user", text: normalized });
      scheduleAnalysis();
    },
    [onTranscript, scheduleAnalysis]
  );

  const appendAssistantTranscript = useCallback(
    (text) => {
      const normalized = text?.trim();
      if (!normalized) return;
      accumulatedText.current += `\nAssistent: ${normalized}`;
      onTranscript?.({ speaker: "assistant", text: normalized });
      log("Klaar om te luisteren");
    },
    [log, onTranscript]
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
          if (result.isFinal) appendUserTranscript(result[0]?.transcript || "");
        }
      };
      recognition.onerror = (event) => {
        if (event?.error !== "no-speech" && event?.error !== "aborted") {
          console.warn("Speech recognition error:", event.error);
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
    userTranscriptLines.current = [];
    lastAnalyzedText.current = "";
    lastUserUtterance.current = "";
    lastUserUtteranceAt.current = 0;
    seenUserItems.current = new Set();
    seenAssistantItems.current = new Set();

    try {
      const { RealtimeAgent, RealtimeSession } = await import("@openai/agents/realtime");

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

      const onHistoryAdded = (item) => {
        if (!item || item.type !== "message") return;

        if (item.role === "user" && item.status === "completed") {
          if (seenUserItems.current.has(item.itemId)) return;
          seenUserItems.current.add(item.itemId);
          appendUserTranscript(extractTextFromMessageItem(item));
          return;
        }

        if (item.role === "assistant" && item.status === "completed") {
          if (seenAssistantItems.current.has(item.itemId)) return;
          seenAssistantItems.current.add(item.itemId);
          appendAssistantTranscript(extractTextFromMessageItem(item));
        }
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
            appendUserTranscript(event?.transcript || "");
            break;
          }
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
      session.on("transport_event", onTransportEvent);
      session.on("error", onSessionError);
      session.transport.on("connection_change", onConnectionChange);

      listenerCleanupRef.current.push(
        () => session.off("history_added", onHistoryAdded),
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

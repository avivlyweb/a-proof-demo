import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Mic, MicOff, Loader } from "lucide-react";

export default function VoiceInput({ onTranscript, onAnalysis, onStatusChange }) {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState("Klaar om te beginnen");

  const peerConnection = useRef(null);
  const dataChannel = useRef(null);
  const micStream = useRef(null);
  const audioPlayer = useRef(null);
  const analysisTimer = useRef(null);
  const accumulatedText = useRef("");
  const lastAnalyzedText = useRef("");
  const sessionIdRef = useRef("");

  const log = useCallback(
    (msg) => {
      setStatus(msg);
      onStatusChange?.(msg);
    },
    [onStatusChange]
  );

  // ------------------------------------------------------------------
  // Debounced ICF analysis — fires 3 seconds after last new speech
  // ------------------------------------------------------------------
  const scheduleAnalysis = useCallback(() => {
    if (analysisTimer.current) clearTimeout(analysisTimer.current);
    analysisTimer.current = setTimeout(async () => {
      const text = accumulatedText.current.trim();
      if (!text || text === lastAnalyzedText.current) return;
      lastAnalyzedText.current = text;

      try {
        const res = await base44.functions.invoke("analyzeIcfDomains", {
          conversationText: text,
          recentTranscript: text.split("\n").slice(-4).join("\n"),
        });

        const payload = res?.data?.data || res?.data;
        if (payload) onAnalysis?.(payload);
      } catch (err) {
        console.warn("ICF analysis failed:", err);
      }
    }, 3000);
  }, [onAnalysis]);

  // ------------------------------------------------------------------
  // Data channel message handler
  // ------------------------------------------------------------------
  const handleMessage = useCallback(
    (event) => {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "session.created":
            log("Sessie gestart");
            break;

          case "input_audio_buffer.speech_started":
            log("Ik luister...");
            break;

          case "input_audio_buffer.speech_stopped":
            log("Een ogenblikje...");
            break;

          case "response.audio_transcript.done":
            if (data.transcript) {
              const text = data.transcript.trim();
              accumulatedText.current += `\nAssistent: ${text}`;
              onTranscript?.({ speaker: "assistant", text });
              scheduleAnalysis();
            }
            log("Klaar om te luisteren");
            break;

          case "conversation.item.input_audio_transcription.completed": {
            const userText =
              data?.transcript?.trim() ||
              extractUserText(data);
            if (userText) {
              accumulatedText.current += `\nPatient: ${userText}`;
              onTranscript?.({ speaker: "user", text: userText });
              scheduleAnalysis();
            }
            break;
          }

          case "conversation.item.created": {
            const userText = extractUserText(data);
            if (userText) {
              accumulatedText.current += `\nPatient: ${userText}`;
              onTranscript?.({ speaker: "user", text: userText });
              scheduleAnalysis();
            }
            break;
          }

          case "response.done":
            log("Klaar om te luisteren");
            break;

          case "error":
            console.error("OpenAI error:", data);
            log("Fout: " + (data?.error?.message || "onbekend"));
            break;

          default:
            break;
        }
      } catch (e) {
        console.error("Error parsing message:", e);
      }
    },
    [log, onTranscript, scheduleAnalysis]
  );

  function extractUserText(data) {
    if (typeof data?.transcript === "string" && data.transcript.trim())
      return data.transcript.trim();
    const item = data?.item;
    if (!item || item.role !== "user") return "";
    const content = Array.isArray(item.content) ? item.content : [];
    for (const block of content) {
      if (typeof block?.text === "string" && block.text.trim())
        return block.text.trim();
      if (typeof block?.transcript === "string" && block.transcript.trim())
        return block.transcript.trim();
    }
    return "";
  }

  // ------------------------------------------------------------------
  // Send session configuration after data channel opens
  // ------------------------------------------------------------------
  const sendSessionConfig = useCallback(() => {
    if (!dataChannel.current || dataChannel.current.readyState !== "open") return;

    dataChannel.current.send(
      JSON.stringify({
        type: "session.update",
        session: {
          type: "realtime",
          instructions: `Je bent Leo, een warme en geduldige gesprekspartner. Je voert natuurlijke, prettige gesprekken met ouderen in eenvoudig Nederlands.

JE KERNPRINCIPE:
De persoon staat centraal, niet de vragenlijst. Het gesprek moet voelen als een prettige, zinvolle interactie — niet als een interview.

JE PERSOONLIJKHEID:
- Warm, geduldig, oprecht nieuwsgierig en bescheiden
- Rustige, vriendelijke luisteraar
- Je vergeet nooit wat iemand je verteld heeft
- Voelbaar betrokken maar niet overdreven emotioneel
- Gebruik korte zinnen, maximaal 10 woorden per zin
- Stel een vraag tegelijk

GESPREKSREGELS:
1. Begin met een warme begroeting: "Goedemiddag! Fijn dat we even kunnen praten. Hoe gaat het vandaag met u?"
2. Luister actief en verwijs terug naar wat eerder is gezegd
   - NIET: "Hoe gaat het met lopen?"
   - WEL: "U vertelde dat u graag in de tuin werkt. Lukt het lopen naar de tuin nog goed?"
3. Als iemand een naam noemt (kleindochter Anna, buurvrouw Truus), onthoud die en gebruik deze later
4. Herken emoties en valideer ze:
   - "Dat klinkt alsof het u veel energie kost."
   - "Het is heel begrijpelijk dat u zich daar zorgen over maakt."
   - "Wat fijn om te horen dat u daar zo van geniet!"
5. Maak natuurlijke bruggen tussen onderwerpen:
   - "Als u zich zo moe voelt na het boodschappen doen, heeft dat dan ook invloed op hoe u slaapt?"
6. Stel GEEN open vragen. Bied twee keuzes aan ("Wil u koffie of thee?") of stel ja/nee-vragen
7. Vermijd robotische herhalingen zoals "Dus u zegt dat..."

ONDERWERPEN OM NATUURLIJK TE VERKENNEN (niet als checklist!):
- Dagelijkse bezigheden en energie ("Wat heeft u vandaag allemaal gedaan?")
- Beweging en mobiliteit ("Gaat u nog wel eens wandelen?")
- Eten en drinken ("Kunt u me vertellen over uw eetgewoontes?")
- Stemming en emoties ("Hoe voelt u zich de laatste tijd?")
- Concentratie en geheugen ("Kunt u nog goed een boek lezen?")
- Ademhaling en inspanning ("Wordt u snel buiten adem?")
- Werk en dagelijkse taken ("Welke klusjes doet u nog graag zelf?")
- Sociaal contact ("Heeft u deze week nog bezoek gehad?")

BELANGRIJK:
- Spreek uitsluitend Nederlands
- Gebruik de stem van een warme, geduldige vriend — niet een dokter
- Als iemand gefrustreerd raakt, toon empathie en verander van onderwerp
- Eindig elke interactie positief
- Spreek langzaam en duidelijk`,
          voice: "alloy",
          input_audio_format: "pcm16",
          output_audio_format: "pcm16",
          input_audio_transcription: { model: "whisper-1" },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 1200,
          },
          tools: [],
          tool_choice: "none",
          temperature: 0.7,
          max_response_output_tokens: 2048,
        },
      })
    );
  }, []);

  // ------------------------------------------------------------------
  // Start voice session (WebRTC + ephemeral token)
  // ------------------------------------------------------------------
  const startSession = useCallback(async () => {
    if (peerConnection.current) return;
    setIsConnecting(true);
    sessionIdRef.current = `aproof_${Date.now()}`;
    accumulatedText.current = "";
    lastAnalyzedText.current = "";

    try {
      log("Sessie token aanvragen...");
      const response = await base44.functions.invoke("createOpenAISession");
      const ephemeralKey =
        response?.data?.value ||
        response?.data?.client_secret?.value;

      if (!ephemeralKey) throw new Error("Geen sessie token ontvangen");

      log("WebRTC verbinding opstarten...");
      const pc = new RTCPeerConnection();
      peerConnection.current = pc;

      // Audio output
      if (!audioPlayer.current) {
        audioPlayer.current = document.createElement("audio");
        audioPlayer.current.autoplay = true;
        audioPlayer.current.style.display = "none";
        document.body.appendChild(audioPlayer.current);
      }
      pc.ontrack = (e) => {
        if (e.streams?.[0]) audioPlayer.current.srcObject = e.streams[0];
      };

      // Mic input
      micStream.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
        },
      });
      micStream.current.getTracks().forEach((t) => pc.addTrack(t, micStream.current));

      // Data channel
      const dc = pc.createDataChannel("oai-events");
      dataChannel.current = dc;

      dc.onopen = () => {
        setIsActive(true);
        setIsConnecting(false);
        log("Verbonden — spreek nu");
        sendSessionConfig();
      };
      dc.onclose = () => {
        log("Data kanaal gesloten");
        setIsActive(false);
      };
      dc.onmessage = handleMessage;

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (state === "failed" || state === "disconnected" || state === "closed") {
          stopSession();
        }
      };

      // SDP exchange
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch("https://api.openai.com/v1/realtime/calls", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });

      if (!sdpRes.ok) throw new Error(`SDP fout: ${sdpRes.status}`);

      const answer = { type: "answer", sdp: await sdpRes.text() };
      await pc.setRemoteDescription(answer);
      log("Verbinding wordt opgebouwd...");
    } catch (err) {
      console.error("startSession error:", err);
      log(`Fout: ${err.message}`);
      stopSession();
    }
  }, [log, handleMessage, sendSessionConfig]);

  // ------------------------------------------------------------------
  // Stop session
  // ------------------------------------------------------------------
  const stopSession = useCallback(() => {
    if (analysisTimer.current) clearTimeout(analysisTimer.current);
    if (dataChannel.current) {
      dataChannel.current.close();
      dataChannel.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    if (micStream.current) {
      micStream.current.getTracks().forEach((t) => t.stop());
      micStream.current = null;
    }
    if (audioPlayer.current && document.body.contains(audioPlayer.current)) {
      document.body.removeChild(audioPlayer.current);
      audioPlayer.current = null;
    }
    setIsActive(false);
    setIsConnecting(false);
    log("Sessie gestopt");
  }, [log]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (peerConnection.current) stopSession();
    };
  }, [stopSession]);

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
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

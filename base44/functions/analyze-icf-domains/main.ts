import { createClientFromRequest } from "npm:@base44/sdk@0.7.1";
import { ICF_KB_INDEX } from "./icf_kb_index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeCode(code: string): string {
  if (!code) return code;
  if (code.startsWith("d840")) return "d840";
  if (code.startsWith("d841") || code.startsWith("d842") || code.startsWith("d845") || code.startsWith("d850") || code.startsWith("d859")) {
    return "d840";
  }
  return code;
}

function upsertDomain(domains: any[], candidate: any) {
  const existingIndex = domains.findIndex((d) => d.code === candidate.code);
  if (existingIndex === -1) {
    domains.push(candidate);
    return;
  }
  const existing = domains[existingIndex];
  const existingScore = Number(existing?.confidence ?? 0);
  const candidateScore = Number(candidate?.confidence ?? 0);
  if (candidateScore > existingScore) domains[existingIndex] = candidate;
}

function uniqStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

function computeKBCandidates(text: string) {
  const normalized = text.toLowerCase();
  const tokenSet = new Set(tokenize(text));
  const scores: { code: string; label_nl: string; score: number; matched: string[] }[] = [];

  for (const item of ICF_KB_INDEX) {
    let score = 0;
    const matched: string[] = [];

    for (const kw of item.keywords || []) {
      if (kw.length < 3) continue;
      if (tokenSet.has(kw)) {
        score += kw.length >= 8 ? 0.14 : 0.1;
        matched.push(kw);
        continue;
      }
      if (kw.includes(" ") && normalized.includes(kw)) {
        score += 0.16;
        matched.push(kw);
      }
    }

    if (score >= 0.12 && matched.length > 0) {
      scores.push({
        code: item.code,
        label_nl: item.label_nl,
        score: Math.min(0.95, score),
        matched: uniqStrings(matched).slice(0, 6),
      });
    }
  }

  const byCode = new Map(scores.map((s) => [s.code, s]));
  for (const item of ICF_KB_INDEX) {
    const base = byCode.get(item.code);
    if (!base || !Array.isArray(item.related)) continue;
    for (const rel of item.related) {
      const relEntry = byCode.get(rel);
      if (relEntry) relEntry.score = Math.min(0.95, relEntry.score + 0.03);
    }
  }

  return [...byCode.values()].sort((a, b) => b.score - a.score);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json();
    const conversationText = body.conversationText || "";
    const recentTranscript = body.recentTranscript || "";

    if (!conversationText && !recentTranscript) {
      return new Response(JSON.stringify({ error: "No text provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const textToAnalyze = conversationText || recentTranscript;
    const kbCandidates = computeKBCandidates(textToAnalyze);
    const candidateSlice = kbCandidates.slice(0, 40);
    const candidatePrompt = candidateSlice
      .map((c) => `- ${c.code} (${c.label_nl}) | score=${c.score.toFixed(2)} | matches=${c.matched.join(", ")}`)
      .join("\n");

    const prompt = `Je bent een klinisch taalmodel getraind op Nederlandse medische teksten, gebaseerd op het A-PROOF project (VU Amsterdam/CLTL).

Analyseer het volgende gesprek en bepaal welke van de 9 ICF-domeinen worden besproken. Geef per domein een ernstniveau volgens de WHO-ICF kwalificatieschaal.

BELANGRIJKE INTERPRETATIEREGEL:
- Maak onderscheid tussen intrinsieke loopbeperking (d450/FAC) en omgevingsbarrières.
- Als "niet kunnen lopen" vooral door weersomstandigheden komt (regen/sneeuw/ijzel/storm), classificeer dit primair als omgevingsfactor e225 (weer), NIET automatisch als verslechtering van d450.
- Verhoog d450 alleen als er aanwijzingen zijn voor intrinsieke mobiliteitsproblemen (balans, hulp nodig, pijn, zwakte, valincidenten, hulpmiddelafhankelijkheid).

WHO-ICF Ernstschaal (standaard voor alle domeinen behalve FAC):
  0 = Geen probleem (0-4%)
  1 = Licht probleem (5-24%)
  2 = Matig probleem (25-49%)
  3 = Ernstig probleem (50-95%)
  4 = Volledig probleem (96-100%)

De 9 A-PROOF domeinen:
1. b1300 - Energieniveau (schaal 0-4). Sleutelwoorden: moe, vermoeidheid, uitgeput, energie, uitputting, slaperig
2. b140 - Aandachtsfuncties (schaal 0-4). Sleutelwoorden: concentratie, aandacht, focus, vergeetachtig, geheugen
3. b152 - Emotionele functies (schaal 0-4). Sleutelwoorden: stemming, emotie, verdrietig, angstig, somber, bang, eenzaam
4. b440 - Ademhalingsfuncties (schaal 0-4). Sleutelwoorden: ademhaling, kortademig, benauwd, hoesten, buiten adem
5. b455 - Inspanningstolerantie (schaal 0-4). Sleutelwoorden: inspanning, vermoeidheid bij activiteit, snel moe, uitputting
6. b530 - Gewichtshandhaving (schaal 0-4). Sleutelwoorden: gewicht, afgevallen, aangekomen, eetlust, voeding
7. d450 - Lopen/FAC (FAC-schaal 0-5: 0=kan niet lopen, 1=hulp nodig, 2=steun bij balans, 3=zelfstandig met toezicht, 4=zelfstandig vlak terrein, 5=volledig zelfstandig). Sleutelwoorden: lopen, wandelen, vallen, rollator, trap, balans, evenwicht
8. d550 - Eten (schaal 0-4). Sleutelwoorden: eten, slikken, kauwen, maaltijd, voeding
9. d840-d859 - Werk en werkgelegenheid (schaal 0-4). Sleutelwoorden: werk, baan, dagbesteding, huishouden, taken

Responsemapping (voorbeeld):
- "zonder problemen" / "dat gaat prima" → 0
- "een beetje moeite" / "soms lastig" → 1
- "matige moeite" / "dat valt niet mee" → 2
- "ernstige moeite" / "dat lukt bijna niet" → 3
- "kan helemaal niet" / "dat is onmogelijk" → 4

Belangrijk:
- Alleen domeinen rapporteren die DUIDELIJK in de tekst worden besproken
- HOGERE scores = MEER problemen (standaard WHO-ICF)
- Uitzondering: d450 (Lopen) gebruikt de FAC-schaal waar HOGERE scores = MEER zelfstandig
- Geef evidence: welke woorden/zinnen leidden tot de detectie
- Geef een confidence score (0-1) per domein
- Bij vage antwoorden, gebruik een lagere confidence score (< 0.6)
- Bij co-occurrence (bijv. lopen + valangst) mag je met confidence 0.50-0.60 een waarschijnlijke koppeling maken
- Voeg [verify with clinician] toe wanneer confidence < 0.55

Maak daarnaast een top-10 lijst met de meest relevante ICF-codes voor deze sessie, op basis van onderstaande kandidaten uit de knowledgebase.

Candidate codes vanuit knowledgebase:
${candidatePrompt || "- Geen sterke kandidaten uit keyword matching"}

Tekst om te analyseren:
"${textToAnalyze}"`;

    const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          domains: {
            type: "array",
            items: {
              type: "object",
              properties: {
                code: { type: "string", description: "ICF code (e.g. b1300, d450)" },
                name: { type: "string", description: "Domain name in Dutch" },
                level: { type: "number", description: "Functioning level (0-4 or 0-5)" },
                max_level: { type: "number", description: "Maximum level for this domain (4 or 5)" },
                confidence: { type: "number", description: "Confidence score 0-1" },
                evidence: { type: "array", items: { type: "string" }, description: "Keywords/phrases that triggered detection" },
                reasoning: { type: "string", description: "Brief explanation" }
              },
              required: ["code", "name", "level", "max_level", "confidence", "evidence"]
            }
          },
          summary: { type: "string", description: "Brief clinical summary in Dutch" },
          keywords_found: { type: "array", items: { type: "string" } },
          context_factors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                code: { type: "string" },
                label: { type: "string" },
                qualifier: { type: "number" },
                impact: { type: "string" },
                confidence: { type: "number" },
                evidence: { type: "array", items: { type: "string" } }
              }
            }
          },
          top_icf_codes: {
            type: "array",
            items: {
              type: "object",
              properties: {
                code: { type: "string" },
                label: { type: "string" },
                qualifier: { type: "number" },
                confidence: { type: "number" },
                evidence: { type: "array", items: { type: "string" } },
                reasoning: { type: "string" }
              }
            }
          }
        },
        required: ["domains", "summary"]
      }
    });

    const domainsRaw = Array.isArray(response?.domains) ? response.domains : [];
    const domains = domainsRaw
      .map((d: any) => ({
        ...d,
        code: normalizeCode(String(d?.code || "")),
      }))
      .filter((d: any) => d.code);

    for (const d of domains) {
      if (d.code === "d450") {
        d.max_level = 5;
        d.level = Math.max(0, Math.min(5, Number(d.level ?? 0)));
      } else {
        d.max_level = 4;
        d.level = Math.max(0, Math.min(4, Number(d.level ?? 0)));
      }
      d.confidence = Math.max(0, Math.min(1, Number(d.confidence ?? 0.5)));
      d.evidence = Array.isArray(d.evidence) ? d.evidence : [];
    }

    const text = textToAnalyze.toLowerCase();
    const contextFactors = Array.isArray(response?.context_factors) ? response.context_factors : [];
    const topIcfCodesRaw = Array.isArray(response?.top_icf_codes) ? response.top_icf_codes : [];
    const topIcfCodes = topIcfCodesRaw
      .map((item: any) => ({
        code: normalizeCode(String(item?.code || "").toLowerCase()),
        label: String(item?.label || ""),
        qualifier: Math.max(0, Math.min(4, Number(item?.qualifier ?? 1))),
        confidence: Math.max(0, Math.min(1, Number(item?.confidence ?? 0.5))),
        evidence: Array.isArray(item?.evidence) ? item.evidence : [],
        reasoning: String(item?.reasoning || ""),
      }))
      .filter((item: any) => item.code)
      .slice(0, 10);

    const candidateFallback = candidateSlice.map((c) => ({
      code: normalizeCode(c.code),
      label: c.label_nl,
      qualifier: c.code === "d450" ? 2 : 1,
      confidence: Math.max(0.45, Math.min(0.9, c.score)),
      evidence: c.matched,
      reasoning: "Knowledgebase keyword matching",
    }));

    const mergedTopCodes = (topIcfCodes.length > 0 ? topIcfCodes : candidateFallback)
      .slice(0, 10)
      .map((item: any) => {
        if ((item.confidence ?? 1) < 0.55) {
          const r = String(item.reasoning || "").trim();
          item.reasoning = r.includes("[verify with clinician]") ? r : `${r} [verify with clinician]`.trim();
        }
        return item;
      });

    const weatherWords = ["regen", "sneeuw", "storm", "ijzel", "glad", "slecht weer", "weer"];
    const causalWords = ["door", "vanwege", "omdat", "door het weer", "vanwege de regen"];
    const intrinsicWalkingWords = [
      "balans",
      "evenwicht",
      "rollator",
      "stok",
      "hulp",
      "trap",
      "duizelig",
      "pijn",
      "zwak",
      "zwakte",
      "valangst",
      "gevallen",
      "vallen"
    ];

    const hasWeatherSignal = weatherWords.some((w) => text.includes(w));
    const hasCausalSignal = causalWords.some((w) => text.includes(w));
    const hasIntrinsicWalkingSignal = intrinsicWalkingWords.some((w) => text.includes(w));
    const weatherLikelyPrimaryBarrier = hasWeatherSignal && (hasCausalSignal || text.includes("kan niet lopen")) && !hasIntrinsicWalkingSignal;
    const hasVagueSignal = ["alles is moeilijk", "gaat moeilijk", "moeilijk", "lastig", "zwaar"].some((w) => text.includes(w));

    if ((text.includes("gevallen") || text.includes("vallen") || text.includes("valangst")) && !domains.some((d: any) => d.code === "d450")) {
      upsertDomain(domains, {
        code: "d450",
        name: "Lopen",
        level: 2,
        max_level: 5,
        confidence: 0.58,
        evidence: ["gevallen", "vallen"],
        reasoning: "Heuristische aanvulling op basis van val-gerelateerde taal.",
      });
    }

    if ((text.includes("spanning") || text.includes("angst") || text.includes("bang")) && !domains.some((d: any) => d.code === "b152")) {
      upsertDomain(domains, {
        code: "b152",
        name: "Emotioneel",
        level: 1,
        max_level: 4,
        confidence: 0.56,
        evidence: ["spanning", "angst", "bang"],
        reasoning: "Heuristische aanvulling op basis van emotionele signalen.",
      });
    }

    if (hasVagueSignal) {
      const mentionsWalking = text.includes("lopen") || text.includes("wandelen");
      const mentionsFear = text.includes("bang") || text.includes("angst") || text.includes("valangst");

      if (mentionsWalking && !domains.some((d: any) => d.code === "b152")) {
        upsertDomain(domains, {
          code: "b152",
          name: "Emotioneel",
          level: 1,
          max_level: 4,
          confidence: 0.53,
          evidence: ["moeite met lopen", "vage klacht"],
          reasoning: "Co-occurrence regel (lopen -> emotionele belasting) [verify with clinician].",
        });
      }

      if (mentionsFear && !domains.some((d: any) => d.code === "d450")) {
        upsertDomain(domains, {
          code: "d450",
          name: "Lopen",
          level: 3,
          max_level: 5,
          confidence: 0.53,
          evidence: ["angst", "vage klacht"],
          reasoning: "Co-occurrence regel (angst -> mogelijke loopbeperking) [verify with clinician].",
        });
      }
    }

    for (const d of domains) {
      if ((d.confidence ?? 1) < 0.55) {
        const baseReasoning = String(d.reasoning || "").trim();
        d.reasoning = baseReasoning.includes("[verify with clinician]")
          ? baseReasoning
          : `${baseReasoning} [verify with clinician]`.trim();
      }
    }

    if (hasWeatherSignal) {
      const weatherEvidence = uniqStrings(weatherWords.filter((w) => text.includes(w)));
      contextFactors.push({
        code: "e225",
        label: "Weersomstandigheden",
        qualifier: weatherLikelyPrimaryBarrier ? 2 : 1,
        impact: weatherLikelyPrimaryBarrier ? "barrier" : "possible_barrier",
        confidence: weatherLikelyPrimaryBarrier ? 0.78 : 0.62,
        evidence: weatherEvidence,
      });
    }

    if (weatherLikelyPrimaryBarrier) {
      const d450Index = domains.findIndex((d: any) => d.code === "d450");
      if (d450Index !== -1) {
        domains[d450Index] = {
          ...domains[d450Index],
          level: Math.max(4, Number(domains[d450Index].level ?? 4)),
          confidence: Math.min(Number(domains[d450Index].confidence ?? 0.6), 0.55),
          evidence: uniqStrings([...(domains[d450Index].evidence || []), "weergerelateerde beperking"]),
          reasoning:
            "Loopbeperking lijkt primair contextueel door weersomstandigheden; geen sterke aanwijzing voor intrinsieke verslechtering.",
        };
      }

      const weatherNote = "Context: mogelijk omgevingsbarriere e225 (weer) als primaire oorzaak.";
      const existingSummary = String(response?.summary || "").trim();
      const summary = existingSummary.includes("e225") ? existingSummary : `${existingSummary} ${weatherNote}`.trim();

      return new Response(JSON.stringify({ data: { ...response, domains, context_factors: contextFactors, top_icf_codes: mergedTopCodes, summary } }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ data: { ...response, domains, context_factors: contextFactors, top_icf_codes: mergedTopCodes } }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error analyzing ICF domains:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

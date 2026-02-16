import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Load knowledge bases from uploaded files
const KNOWLEDGE_BASE_URLS = {
  conversational: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992a141a54fe4b5520ddfef/d522743fa_icf_customgpt_knowledge_base_extended.json',
  icfCategories: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992a141a54fe4b5520ddfef/bc803f2c7_icf_categories_complete.json',
  dialogues: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992a141a54fe4b5520ddfef/914527d33_comprehensive_elderly_dialogues_dutch.json',
  fallPrevention: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992a141a54fe4b5520ddfef/512b77c5b_12_enhanced_fall_prevention_2025.json',
};

// Cache for loaded knowledge bases
let knowledgeCache = {};

async function loadKnowledgeBase(key) {
  if (knowledgeCache[key]) return knowledgeCache[key];
  
  try {
    const response = await fetch(KNOWLEDGE_BASE_URLS[key]);
    const data = await response.json();
    knowledgeCache[key] = data;
    return data;
  } catch (error) {
    console.error(`Failed to load ${key} knowledge base:`, error);
    return null;
  }
}

function buildEnrichedPrompt(conversationText, knowledgeBases) {
  const { conversational, icfCategories, dialogues, fallPrevention } = knowledgeBases;
  
  // Extract empathic phrases and conversation patterns
  const elderlyPhrases = conversational?.conversation_patterns?.elderly_friendly_phrases || {};
  const icfPatterns = conversational?.conversation_patterns?.icf_extraction_patterns || {};
  
  // Build contextual prompt
  let prompt = `Je bent Leo, een warme, empathische AI-assistent gespecialiseerd in ICF-classificatie voor ouderenzorg.

# JOUW ROL & TOON
- Warm, geduldig, oprecht nieuwsgierig
- Gebruik NOOIT robotische herhalingen zoals "Dus u zegt dat..."
- Erken emoties subtiel: "Dat klinkt als een uitdaging" in plaats van herhalen
- Stel open, verdiepende vragen die verbinding maken met eerdere opmerkingen

# EMPATHISCHE ZINNEN OM TE GEBRUIKEN
Opvolgende vragen: ${elderlyPhrases.follow_up_questions?.join(', ') || 'Kunt u daar wat meer over vertellen?'}
Empathische reacties: ${elderlyPhrases.empathy_responses?.join(', ') || 'Dat begrijp ik goed'}

# ICF ANALYSE OPDRACHT
Analyseer het volgende gesprek en identificeer ICF-domeinen met:
1. ICF code (bv. d450, b152)
2. Ernst niveau (0-4): ${JSON.stringify(conversational?.conversation_patterns?.icf_extraction_patterns?.activities_participation?.d450_walking?.response_mapping || {})}
3. Betrouwbaarheid score (0.0-1.0)
4. Bewijs keywords uit het gesprek
5. Redeneringen waarom je deze classificatie kiest

# KLINISCHE KENNIS
`;

  // Add relevant ICF domain info
  if (icfCategories && Array.isArray(icfCategories)) {
    prompt += `\nICF Domeinen om te herkennen:\n`;
    icfCategories.slice(0, 20).forEach(cat => {
      if (cat.info_text && cat.question) {
        prompt += `- ${cat.icf_code}: ${cat.info_text} - ${cat.question}\n`;
      }
    });
  }

  // Add fall prevention context if mobility is mentioned
  if (conversationText.toLowerCase().includes('lopen') || 
      conversationText.toLowerCase().includes('vallen') ||
      conversationText.toLowerCase().includes('rollator')) {
    const fallRisks = fallPrevention?.risk_factors?.patient_factors || [];
    prompt += `\n# VALRISICO FACTOREN\n${fallRisks.slice(0, 5).join(', ')}\n`;
  }

  // Add example dialogues for context
  if (dialogues?.dialogues && Array.isArray(dialogues.dialogues)) {
    prompt += `\n# VOORBEELD UITSPRAKEN EN HUN ICF CODES\n`;
    dialogues.dialogues.slice(0, 5).forEach(d => {
      if (d.dialogue && d.icf_code) {
        prompt += `"${d.dialogue[1]}" → ${d.icf_code} (${d.icf_description})\n`;
      }
    });
  }

  prompt += `\n# GESPREK OM TE ANALYSEREN
${conversationText}

# VERWACHTE OUTPUT (JSON)
Geef een JSON object terug met deze structuur:
{
  "domains": [
    {
      "code": "d450",
      "level": 2,
      "confidence": 0.85,
      "evidence": ["lopen met rollator", "angst om te vallen"],
      "reasoning": "Patient geeft aan moeite te hebben met lopen en gebruikt hulpmiddel"
    }
  ],
  "summary": "Korte klinische samenvatting in menselijke taal"
}

BELANGRIJK: 
- Gebruik een confidence < 0.55 als je onzeker bent
- Verbind verschillende observaties (bv. loopmoeilijkheden + valangst)
- Wees specifiek met bewijs uit het gesprek`;

  return prompt;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationText } = await req.json();
    
    if (!conversationText) {
      return Response.json({ error: 'conversationText is required' }, { status: 400 });
    }

    // Load all knowledge bases
    const [conversational, icfCategories, dialogues, fallPrevention] = await Promise.all([
      loadKnowledgeBase('conversational'),
      loadKnowledgeBase('icfCategories'),
      loadKnowledgeBase('dialogues'),
      loadKnowledgeBase('fallPrevention'),
    ]);

    const knowledgeBases = { conversational, icfCategories, dialogues, fallPrevention };
    
    // Build enriched prompt
    const enrichedPrompt = buildEnrichedPrompt(conversationText, knowledgeBases);
    
    // Call LLM with enriched context
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: enrichedPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          domains: {
            type: "array",
            items: {
              type: "object",
              properties: {
                code: { type: "string" },
                level: { type: "number" },
                confidence: { type: "number" },
                evidence: { type: "array", items: { type: "string" } },
                reasoning: { type: "string" }
              }
            }
          },
          summary: { type: "string" }
        }
      }
    });

    return Response.json(analysis);
    
  } catch (error) {
    console.error('Analysis error:', error);
    return Response.json({ 
      error: error.message,
      details: 'Failed to analyze conversation'
    }, { status: 500 });
  }
});
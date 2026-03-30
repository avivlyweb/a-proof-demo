export const APROOF_DOMAINS = [
  // ── Original 9 domains ──
  { code: "b1300", name: "Energy level", nameNl: "Energie", repo: "ENR", maxLevel: 4, scaleType: "generic", color: "#F59E0B", description: "Energy level and fatigue" },
  { code: "b140", name: "Attention", nameNl: "Aandacht", repo: "ATT", maxLevel: 4, scaleType: "generic", color: "#8B5CF6", description: "Attention and concentration functions" },
  { code: "b152", name: "Emotional", nameNl: "Emotioneel", repo: "STM", maxLevel: 4, scaleType: "generic", color: "#EC4899", description: "Emotional functions and mood" },
  { code: "b440", name: "Respiration", nameNl: "Ademhaling", repo: "ADM", maxLevel: 4, scaleType: "generic", color: "#06B6D4", description: "Respiration functions" },
  { code: "b455", name: "Exercise tolerance", nameNl: "Inspanning", repo: "INS", maxLevel: 5, scaleType: "mets", color: "#10B981", description: "Exercise tolerance (MET-based)" },
  { code: "b530", name: "Weight", nameNl: "Gewicht", repo: "MBW", maxLevel: 4, scaleType: "generic", color: "#F97316", description: "Weight maintenance functions" },
  { code: "d450", name: "Walking", nameNl: "Lopen", repo: "FAC", maxLevel: 5, scaleType: "fac", color: "#3B82F6", description: "Walking and mobility (FAC)", confidenceCap: 0.8, evidenceGrade: "C" },
  { code: "d550", name: "Eating", nameNl: "Eten", repo: "ETN", maxLevel: 4, scaleType: "generic", color: "#F43F5E", description: "Eating and nutrition" },
  { code: "d840", name: "Work", nameNl: "Werk", repo: "BER", maxLevel: 4, scaleType: "generic", color: "#64748B", description: "Work and employment" },
  // ── 8 new ICF-17 domains ──
  { code: "b280", name: "Pain", nameNl: "Pijn", repo: "SOP", maxLevel: 4, scaleType: "generic", color: "#EF4444", description: "Sensations of pain" },
  { code: "b134", name: "Sleep", nameNl: "Slaap", repo: "SLP", maxLevel: 4, scaleType: "generic", color: "#6366F1", description: "Sleep functions" },
  { code: "d760", name: "Family", nameNl: "Familie", repo: "FML", maxLevel: 4, scaleType: "generic", color: "#D946EF", description: "Family relationships" },
  { code: "b164", name: "Cognition", nameNl: "Cognitie", repo: "HLC", maxLevel: 4, scaleType: "generic", color: "#0EA5E9", description: "Higher-level cognitive functions" },
  { code: "d465", name: "Moving with equipment", nameNl: "Hulpmiddelen", repo: "MAE", maxLevel: 4, scaleType: "generic", color: "#14B8A6", description: "Moving around using equipment" },
  { code: "d410", name: "Body position", nameNl: "Lichaamshouding", repo: "CBP", maxLevel: 4, scaleType: "generic", color: "#A855F7", description: "Changing basic body position" },
  { code: "b230", name: "Hearing", nameNl: "Gehoor", repo: "HRN", maxLevel: 4, scaleType: "generic", color: "#78716C", description: "Hearing functions" },
  { code: "d240", name: "Stress handling", nameNl: "Stresshantering", repo: "HSP", maxLevel: 4, scaleType: "generic", color: "#FB923C", description: "Handling stress and psychological demands" },
];

// A-PROOF reversed scale: 4 = no problem, 0 = complete problem
// Exception: FAC (d450) 0-5 where 5 = fully independent
// Exception: INS (b455) 0-5 where 5 = MET>6
export function getSeverityLabel(level, maxLevel, code) {
  if (level === null || level === undefined) return { label: "Not assessed", color: "gray" };

  // FAC: 0-5 where higher = more independent
  if (code === "d450") {
    if (level >= 5) return { label: "Independent", color: "green" };
    if (level >= 4) return { label: "Independent (level)", color: "lime" };
    if (level >= 3) return { label: "Verbal supervision", color: "amber" };
    if (level >= 2) return { label: "Support needed", color: "orange" };
    if (level >= 1) return { label: "Firm support", color: "red" };
    return { label: "Cannot walk", color: "red" };
  }

  // INS: 0-5 where higher = more capacity (MET-based)
  if (code === "b455") {
    if (level >= 5) return { label: "Full capacity (MET>6)", color: "green" };
    if (level >= 4) return { label: "Good (MET 4-6)", color: "lime" };
    if (level >= 3) return { label: "Moderate (MET 3-4)", color: "amber" };
    if (level >= 2) return { label: "Limited (MET 2-3)", color: "orange" };
    if (level >= 1) return { label: "Minimal (MET 1-2)", color: "red" };
    return { label: "Recumbent only", color: "red" };
  }

  // A-PROOF reversed generic: 4 = no problem, 0 = complete
  if (level >= 4) return { label: "No problem", color: "green" };
  if (level >= 3) return { label: "Mild problem", color: "lime" };
  if (level >= 2) return { label: "Moderate problem", color: "amber" };
  if (level >= 1) return { label: "Severe problem", color: "orange" };
  return { label: "Complete problem", color: "red" };
}

// Bar fill: for A-PROOF reversed scale, higher level = less severe = less fill
export function getLevelPercentage(level, maxLevel, code) {
  if (level === null || level === undefined) return 0;
  // All A-PROOF scales: higher = better, so invert for severity bar display
  return Math.min(100, Math.max(0, ((maxLevel - level) / maxLevel) * 100));
}

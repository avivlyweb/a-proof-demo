export const APROOF_DOMAINS = [
  { code: "b1300", name: "Energie", nameEn: "Energy level", repo: "ENR", maxLevel: 4, color: "#F59E0B", description: "Energieniveau en vermoeidheid" },
  { code: "b140", name: "Aandacht", nameEn: "Attention functions", repo: "ATT", maxLevel: 4, color: "#8B5CF6", description: "Concentratie en aandachtsfuncties" },
  { code: "b152", name: "Emotioneel", nameEn: "Emotional functions", repo: "STM", maxLevel: 4, color: "#EC4899", description: "Emotionele functies en stemming" },
  { code: "b440", name: "Ademhaling", nameEn: "Respiration functions", repo: "ADM", maxLevel: 4, color: "#06B6D4", description: "Ademhalingsfuncties" },
  { code: "b455", name: "Inspanning", nameEn: "Exercise tolerance", repo: "INS", maxLevel: 5, color: "#10B981", description: "Inspanningstolerantie" },
  { code: "b530", name: "Gewicht", nameEn: "Weight maintenance", repo: "MBW", maxLevel: 4, color: "#F97316", description: "Gewichtshandhaving" },
  { code: "d450", name: "Lopen", nameEn: "Walking", repo: "FAC", maxLevel: 5, color: "#3B82F6", description: "Lopen en mobiliteit (FAC)" },
  { code: "d550", name: "Eten", nameEn: "Eating", repo: "ETN", maxLevel: 4, color: "#F43F5E", description: "Eten en voeding" },
  { code: "d840", name: "Werk", nameEn: "Work and employment", repo: "BER", maxLevel: 4, color: "#64748B", description: "Werk en werkgelegenheid" },
];

// WHO-ICF severity scale: 0 = no problem, 4 = complete problem
// Exception: d450 (FAC) uses 0-5 where HIGHER = MORE independent
export function getSeverityLabel(level, maxLevel, code) {
  if (level === null || level === undefined) return { label: "Niet beoordeeld", color: "gray" };

  // FAC scale is inverted: 0 = cannot walk, 5 = fully independent
  if (code === "d450") {
    const ratio = level / maxLevel;
    if (ratio >= 0.8) return { label: "Zelfstandig", color: "green" };
    if (ratio >= 0.6) return { label: "Toezicht nodig", color: "lime" };
    if (ratio >= 0.4) return { label: "Steun nodig", color: "amber" };
    if (ratio >= 0.2) return { label: "Continue hulp", color: "orange" };
    return { label: "Kan niet lopen", color: "red" };
  }

  // Standard ICF: HIGHER = MORE problems
  if (level === 0) return { label: "Geen probleem", color: "green" };
  if (level === 1) return { label: "Licht probleem", color: "lime" };
  if (level === 2) return { label: "Matig probleem", color: "amber" };
  if (level === 3) return { label: "Ernstig probleem", color: "orange" };
  return { label: "Volledig probleem", color: "red" };
}

// Get bar fill percentage
export function getLevelPercentage(level, maxLevel) {
  if (level === null || level === undefined) return 0;
  return Math.min(100, Math.max(0, (level / maxLevel) * 100));
}

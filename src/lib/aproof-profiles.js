export const PATIENT_PROFILES = [
  {
    id: "elderly",
    name: "Elderly (75+)",
    icon: "\u{1F9D3}",
    description: "Fall risk, mobility, cognitive decline, sleep",
    focusDomains: ["d450", "d410", "d465", "b134", "b1300", "b164"],
    context: "Fall risk screening for elderly patient",
    turnEagerness: "patient",
    promptAddition: `Focus on mobility, fall risk, cognitive function, and sleep.
Use calm, patient pacing. Allow extra time for responses.
[slow] Speak clearly and at a gentle pace.
When the patient describes falls or fear of falling, respond with empathy:
"That must be concerning for you."
Prioritize domains: walking (FAC), body position, mobility equipment, sleep, energy, cognition.`,
  },
  {
    id: "postcovid",
    name: "Post-COVID Rehab",
    icon: "\u{1FAC1}",
    description: "Fatigue, breathing, exercise tolerance, return to work",
    focusDomains: ["b1300", "b440", "b455", "b140", "b152", "d840"],
    context: "Post-COVID rehabilitation assessment",
    turnEagerness: "normal",
    promptAddition: `Focus on fatigue, breathing, exercise tolerance, attention, mood, and work capacity.
Many post-COVID patients experience invisible symptoms \u2014 validate their experience.
When someone describes fatigue: "That sounds really exhausting. Can you tell me how this affects your daily routine?"
Prioritize domains: energy, respiration, exercise tolerance, attention, emotional, work.`,
  },
  {
    id: "athlete",
    name: "Young Athlete",
    icon: "\u{1F3C3}",
    description: "Sports injury recovery, pain, mental health, return to sport",
    focusDomains: ["b455", "d450", "b280", "b152", "d840"],
    context: "Sports injury rehabilitation assessment",
    turnEagerness: "eager",
    promptAddition: `Focus on exercise tolerance, mobility, pain, emotional impact, and return to sport/work.
Use a more direct, energetic tone. Athletes often downplay pain \u2014 probe gently.
"I know you want to get back out there \u2014 let\u2019s figure out where you are right now."
Prioritize domains: exercise tolerance, walking, pain, emotional, work.`,
  },
  {
    id: "general",
    name: "General Screening",
    icon: "\u{1F4CB}",
    description: "Broad intake across all 17 ICF domains",
    focusDomains: [],
    context: "General ICF screening",
    turnEagerness: "normal",
    promptAddition: `Conduct a broad screening across all ICF domains.
Start with energy and daily activities, then explore based on what the patient mentions.
Cover as many domains as naturally possible within the conversation.`,
  },
];

export function getProfileById(id) {
  return PATIENT_PROFILES.find((p) => p.id === id) || PATIENT_PROFILES[3];
}

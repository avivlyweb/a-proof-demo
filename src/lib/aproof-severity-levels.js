// Official A-PROOF severity level definitions
// Source: A-PROOF / ZonMw Annotation Guidelines (Kim, 2021)
// Scale is REVERSED: 4 = no problem, 0 = complete problem
// FAC and INS use 0-5

export const SEVERITY_LEVELS = {
  b1300: {
    4: "No problem with the energy level.",
    3: "Slight fatigue that causes mild limitations.",
    2: "Moderate fatigue; gets easily tired from light activities or needs a long time to recover.",
    1: "Severe fatigue; capable of very little.",
    0: "Very severe fatigue; unable to do anything, mostly lays in bed.",
  },
  b140: {
    4: "No problem with concentrating / directing / holding / dividing attention.",
    3: "Slight problem with attention for longer periods or complex tasks.",
    2: "Can concentrate only for a short time.",
    1: "Can barely concentrate / direct / hold / divide attention.",
    0: "Unable to concentrate / direct / hold / divide attention.",
  },
  b152: {
    4: "No problem with emotional functioning: emotions are appropriate, well regulated.",
    3: "Slight problem: irritable, gloomy, etc.",
    2: "Moderate problem: negative emotions such as fear, anger, sadness.",
    1: "Severe problem: intense negative emotions.",
    0: "Flat affect, apathy, unstable, inappropriate emotions.",
  },
  b440: {
    4: "No problem with respiration, respiratory rate normal (EWS: 9-20).",
    3: "Shortness of breath in exercise (saturation ≥90), rate slightly increased (EWS: 21-30).",
    2: "Shortness of breath at rest (saturation ≥90), rate fairly increased (EWS: 31-35).",
    1: "Needs oxygen at rest or during exercise (saturation <90), rate >35.",
    0: "Mechanical ventilation is needed.",
  },
  b455: {
    5: "MET >6. Can tolerate jogging, hard exercises, running, climbing stairs fast, sports.",
    4: "4 ≤ MET < 6. Brisk walking/cycling, heavy housework.",
    3: "3 ≤ MET < 4. Normal pace walking/cycling, gardening, exercises without equipment.",
    2: "2 ≤ MET < 3. Slow walking, grocery shopping, light housework.",
    1: "1 ≤ MET < 2. Can tolerate sitting activities.",
    0: "0 ≤ MET < 1. Only recumbent activities.",
  },
  b530: {
    4: "Healthy weight, no unintentional loss/gain, SNAQ 0-1.",
    3: "Some unintentional weight change, or regained some lost weight.",
    2: "Moderate unintentional change (>3 kg/month), SNAQ 2.",
    1: "Severe unintentional change (>6 kg/6 months), SNAQ ≥ 3.",
    0: "Severe unintentional change (>6 kg/6 months) and admitted to ICU.",
  },
  d450: {
    5: "Walks independently anywhere: level, uneven, slopes, stairs.",
    4: "Independent on level surface; needs help on stairs/inclines/uneven; or walks independently but not fully normal.",
    3: "Requires verbal supervision for walking, no physical contact.",
    2: "Needs continuous/intermittent support of one person for balance.",
    1: "Needs firm continuous support from one person (carrying weight + balance).",
    0: "Cannot walk, or needs two+ people, or treadmill only.",
  },
  d550: {
    4: "Eats independently, good intake, eats according to needs.",
    3: "Eats independently with adjustments, intake >75%, or good with advice.",
    2: "Reduced intake, needs feeding modules/nutrition drinks (not tube/TPN).",
    1: "Intake severely reduced (<50%), tube feeding/TPN needed.",
    0: "Cannot eat, fully dependent on tube feeding/TPN.",
  },
  d840: {
    4: "Can work/study fully (like when healthy).",
    3: "Can work/study almost fully.",
    2: "Can work/study ~50%, or only from home.",
    1: "Work/study is severely limited.",
    0: "Cannot work/study.",
  },
  b280: {
    4: "No pain.",
    3: "Mild pain that causes slight limitations.",
    2: "Moderate pain that limits daily activities.",
    1: "Severe pain that significantly restricts functioning.",
    0: "Complete, constant pain preventing any activity.",
  },
  b134: {
    4: "No sleep problems.",
    3: "Mild sleep disturbance, slight impact on daily functioning.",
    2: "Moderate sleep problems affecting daily activities.",
    1: "Severe sleep disturbance, major impact on functioning.",
    0: "Complete inability to sleep without medication/intervention.",
  },
  d760: {
    4: "No problems in family relationships.",
    3: "Mild difficulties in family interactions.",
    2: "Moderate problems in family relationships.",
    1: "Severe difficulties in family relationships.",
    0: "Complete breakdown of family relationships.",
  },
  b164: {
    4: "No problems with higher cognitive functions (planning, problem-solving).",
    3: "Mild difficulties with complex cognitive tasks.",
    2: "Moderate cognitive difficulties affecting daily decisions.",
    1: "Severe cognitive impairment.",
    0: "Complete inability to plan, decide, or solve problems.",
  },
  d465: {
    4: "No problems moving with equipment (wheelchair, walker, etc.).",
    3: "Mild difficulties using mobility equipment.",
    2: "Moderate difficulties; needs some assistance with equipment.",
    1: "Severe difficulties; heavily dependent on equipment and assistance.",
    0: "Cannot move around even with equipment.",
  },
  d410: {
    4: "No problems changing body position (sitting, standing, bending).",
    3: "Mild difficulty with position changes.",
    2: "Moderate difficulty; needs support for some position changes.",
    1: "Severe difficulty; needs assistance for most position changes.",
    0: "Cannot change body position independently.",
  },
  b230: {
    4: "No hearing problems.",
    3: "Mild hearing difficulty (e.g., in noisy environments).",
    2: "Moderate hearing loss affecting conversations.",
    1: "Severe hearing loss; needs hearing aids or lip-reading.",
    0: "Complete hearing loss / deaf.",
  },
  d240: {
    4: "No problems handling stress or psychological demands.",
    3: "Mild difficulty coping with stress.",
    2: "Moderate difficulty; stress significantly impacts functioning.",
    1: "Severe difficulty; can barely handle any stress.",
    0: "Cannot handle any stress or psychological demands.",
  },
};

export function getSeverityDescription(code, level) {
  return SEVERITY_LEVELS[code]?.[level] || null;
}

import { APROOF_DOMAINS, getLevelPercentage } from "@/lib/aproof-domains";

function getLevelColor(level, maxLevel, code) {
  if (level === null || level === undefined) return "#d1d5db";

  // d450 (FAC) uses inverted scale: HIGHER = MORE independent = better
  const isFAC = code === "d450";
  const ratio = level / maxLevel;
  const severity = isFAC ? 1 - ratio : ratio;

  // severity 0 = no problem (teal), severity 1 = severe (coral)
  if (severity <= 0.05) return "#29C4A9"; // teal — no problem
  if (severity <= 0.25) return "#86EFAC"; // light green — mild
  if (severity <= 0.5) return "#FBBF24";  // amber — moderate
  if (severity <= 0.75) return "#F97316"; // orange — severe
  return "#EC5851";                        // coral — complete problem
}

export default function DomainBars({ domainLevels = {} }) {
  return (
    <div className="space-y-3">
      {APROOF_DOMAINS.map((domain) => {
        const result = domainLevels[domain.code];
        const level = result?.level ?? null;
        const confidence = result?.confidence;
        const pct = getLevelPercentage(level, domain.maxLevel);
        const barColor = getLevelColor(level, domain.maxLevel, domain.code);
        const detected = level !== null && level !== undefined;

        return (
          <div key={domain.code} className="group">
            {/* Label row */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: detected ? domain.color : "#d1d5db" }}
                />
                <span className="text-sm font-medium text-foreground">
                  {domain.name}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">
                  {domain.code}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {detected && confidence != null && (
                  <span className="text-[10px] text-muted-foreground">
                    {Math.round(confidence * 100)}%
                  </span>
                )}
                <span className="text-xs font-semibold tabular-nums min-w-[2rem] text-right" style={{ color: barColor }}>
                  {detected ? `${level}/${domain.maxLevel}` : "—"}
                </span>
              </div>
            </div>

            {/* Bar */}
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${pct}%`,
                  backgroundColor: barColor,
                  opacity: detected ? 1 : 0.3,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

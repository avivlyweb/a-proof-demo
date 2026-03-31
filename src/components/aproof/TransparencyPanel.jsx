import { useState } from "react";
import { APROOF_DOMAINS, getSeverityLabel } from "@/lib/aproof-domains";
import { getSeverityDescription } from "@/lib/aproof-severity-levels";
import { ChevronDown, ChevronUp, Info } from "lucide-react";

export default function TransparencyPanel({ domainLevels = {} }) {
  const [expandedCode, setExpandedCode] = useState(null);

  const scoredDomains = APROOF_DOMAINS.filter(
    (d) => domainLevels[d.code]?.level != null
  );

  if (scoredDomains.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        No domains scored yet. Start a conversation to see transparency details.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {scoredDomains.map((domain) => {
        const result = domainLevels[domain.code];
        const level = result.level;
        const confidence = result.confidence;
        const evidence = result.evidence || [];
        const reasoning = result.reasoning || "";
        const isExpanded = expandedCode === domain.code;
        const severity = getSeverityLabel(level, domain.maxLevel, domain.code);
        const description = getSeverityDescription(domain.code, level);

        return (
          <div key={domain.code} className="rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setExpandedCode(isExpanded ? null : domain.code)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: domain.color }} />
                <span className="text-sm font-medium">{domain.name}</span>
                <span className="text-xs font-mono text-muted-foreground">{domain.code}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold">
                  {level}/{domain.maxLevel} — {severity.label}
                </span>
                {confidence != null && (
                  <span className={`text-xs ${confidence < 0.55 ? "text-amber-500 font-semibold" : "text-muted-foreground"}`}>
                    {Math.round(confidence * 100)}%
                  </span>
                )}
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 pt-1 border-t border-border bg-muted/30 space-y-3">
                {description && (
                  <div>
                    <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground mb-1">
                      <Info className="w-3 h-3" /> Scale reference
                    </div>
                    <p className="text-sm">Level {level} = {description}</p>
                    {domain.scaleType === "fac" && (
                      <p className="text-xs text-muted-foreground mt-1">Functional Ambulation Category (FAC) — 0-5 scale</p>
                    )}
                    {domain.scaleType === "mets" && (
                      <p className="text-xs text-muted-foreground mt-1">MET-based exercise tolerance — 0-5 scale</p>
                    )}
                    {domain.scaleType === "generic" && (
                      <p className="text-xs text-muted-foreground mt-1">A-PROOF reversed scale: 4 = no problem, 0 = complete problem</p>
                    )}
                  </div>
                )}

                {evidence.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-1">Evidence from transcript</div>
                    <ul className="space-y-1">
                      {evidence.map((e, i) => (
                        <li key={i} className="text-sm italic text-foreground/80 pl-3 border-l-2 border-aproof-teal">"{e}"</li>
                      ))}
                    </ul>
                  </div>
                )}

                {reasoning && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-1">Reasoning</div>
                    <p className="text-sm text-foreground/80">{reasoning}</p>
                  </div>
                )}

                {domain.confidenceCap && (
                  <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded px-3 py-2">
                    Voice-based {domain.name} scoring capped at {Math.round(domain.confidenceCap * 100)}%.
                    Physical assessment needed for definitive classification.
                    Evidence grade: {domain.evidenceGrade}.
                  </div>
                )}

                <div className="text-[10px] text-muted-foreground">
                  Source: A-PROOF Annotation Guidelines (Kim et al., 2021) · CLTL/icf17-domains
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

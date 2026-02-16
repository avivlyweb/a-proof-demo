import { Badge } from "@/components/ui/badge";

export default function ContextFactorsPanel({ factors = [] }) {
  if (!Array.isArray(factors) || factors.length === 0) {
    return <div className="text-sm text-muted-foreground">Geen omgevingsfactoren gedetecteerd.</div>;
  }

  return (
    <div className="space-y-2">
      {factors.map((factor, idx) => {
        const score = factor?.confidence != null ? `${Math.round(factor.confidence * 100)}%` : "—";
        const evidence = Array.isArray(factor?.evidence) ? factor.evidence : [];
        return (
          <div key={`${factor.code || "ctx"}-${idx}`} className="rounded-md border border-border p-2">
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-slate-600 text-white text-[10px]">{factor.code || "context"}</Badge>
              <span className="text-xs font-medium text-foreground">{factor.label || "Omgevingsfactor"}</span>
              <span className="text-xs text-muted-foreground">{score}</span>
            </div>
            {evidence.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {evidence.map((item, i) => (
                  <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-muted text-foreground">
                    {item}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

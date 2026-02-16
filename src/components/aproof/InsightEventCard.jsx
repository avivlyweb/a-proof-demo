import { Badge } from "@/components/ui/badge";

export default function InsightEventCard({ event, active = false, onClick }) {
  if (!event) return null;

  const lowConfidence = !!event.lowConfidence;
  const changed = Array.isArray(event.changedDomains) ? event.changedDomains : [];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-3 transition-colors ${
        active ? "border-aproof-teal bg-aproof-teal/5" : "border-border bg-white hover:bg-muted/40"
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Badge className="bg-aproof-coral text-white text-[10px]">Turn {event.turnIndex}</Badge>
          <span className="text-xs text-muted-foreground">{event.speakerLabel}</span>
        </div>
        {lowConfidence && <span className="text-[10px] text-aproof-coral">verify with clinician</span>}
      </div>

      <p className="text-sm text-foreground leading-relaxed line-clamp-2">{event.text}</p>

      {changed.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {changed.slice(0, 4).map((item) => (
            <span key={`${event.id}-${item.code}`} className="text-[11px] px-2 py-0.5 rounded bg-muted text-foreground">
              {item.code} {item.level}/{item.maxLevel}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

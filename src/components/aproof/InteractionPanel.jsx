import { useMemo, useState } from "react";
import InsightEventCard from "@/components/aproof/InsightEventCard";

const FILTERS = [
  { id: "all", label: "Alles" },
  { id: "patient", label: "Patient" },
  { id: "assistant", label: "Assistent" },
  { id: "low", label: "Lage confidence" },
];

export default function InteractionPanel({ events = [], selectedEventId, onSelectEvent }) {
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    switch (filter) {
      case "patient":
        return events.filter((e) => e.speaker === "user");
      case "assistant":
        return events.filter((e) => e.speaker === "assistant");
      case "low":
        return events.filter((e) => e.lowConfidence);
      default:
        return events;
    }
  }, [events, filter]);

  const selected = events.find((e) => e.id === selectedEventId) || filtered[filtered.length - 1] || null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              filter === item.id
                ? "border-aproof-teal bg-aproof-teal/10 text-aproof-teal"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4">Nog geen interacties voor deze filter.</div>
      ) : (
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-4">
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {filtered.map((event) => (
              <InsightEventCard
                key={event.id}
                event={event}
                active={event.id === selected?.id}
                onClick={() => onSelectEvent?.(event.id)}
              />
            ))}
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-3">
            {!selected ? (
              <p className="text-sm text-muted-foreground">Selecteer een interactie voor details.</p>
            ) : (
              <>
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Interactie detail</p>
                <p className="text-sm text-foreground leading-relaxed mb-3">{selected.text}</p>
                <div className="space-y-2">
                  {selected.changedDomains?.map((item) => (
                    <div key={`${selected.id}-${item.code}`} className="rounded-lg bg-white border border-border px-2.5 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground">{item.code}</span>
                        <span className="text-xs text-muted-foreground">
                          {item.level}/{item.maxLevel} · {Math.round((item.confidence || 0) * 100)}%
                        </span>
                      </div>
                      {!!item.evidence?.length && (
                        <p className="text-xs text-muted-foreground mt-1">Evidence: {item.evidence.join(", ")}</p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

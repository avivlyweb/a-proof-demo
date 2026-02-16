export default function SessionTimeline({ events = [], selectedIndex = -1, onSelect }) {
  if (!events.length) {
    return <div className="text-xs text-muted-foreground">Timeline wordt zichtbaar na de eerste detecties.</div>;
  }

  const safeSelected = selectedIndex < 0 ? events.length - 1 : selectedIndex;
  const progress = ((safeSelected + 1) / events.length) * 100;

  return (
    <div>
      <div className="relative h-10 flex items-center px-1">
        <div className="absolute left-1 right-1 h-[2px] bg-border" />
        <div className="absolute left-1 h-[2px] bg-aproof-teal transition-all" style={{ width: `calc(${progress}% - 0.5rem)` }} />
        <div className="relative z-10 w-full flex items-center justify-between">
          {events.map((event, idx) => {
            const isSelected = idx === safeSelected;
            const isVisited = idx <= safeSelected;
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => onSelect?.(idx)}
                className={`h-6 w-6 rounded-full text-[10px] font-semibold border transition-all ${
                  isSelected
                    ? "bg-aproof-teal border-aproof-teal text-white scale-110"
                    : isVisited
                    ? "bg-aproof-teal/10 border-aproof-teal text-aproof-teal"
                    : "bg-white border-border text-muted-foreground"
                }`}
                title={`Turn ${event.turnIndex}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Turn {events[safeSelected]?.turnIndex}: {events[safeSelected]?.changedDomains?.length || 0} domein-updates
      </p>
    </div>
  );
}

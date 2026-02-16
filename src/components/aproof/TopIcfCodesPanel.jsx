export default function TopIcfCodesPanel({ codes = [] }) {
  if (!Array.isArray(codes) || codes.length === 0) {
    return <div className="text-sm text-muted-foreground">Top ICF-codes verschijnen na voldoende patiëntinput.</div>;
  }

  return (
    <div className="space-y-2">
      {codes.slice(0, 10).map((item, idx) => (
        <div key={`${item.code}-${idx}`} className="rounded-lg border border-border bg-white px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-aproof-teal/10 text-aproof-teal">#{idx + 1}</span>
              <span className="text-xs font-semibold text-foreground">{item.code}</span>
              <span className="text-xs text-muted-foreground">{item.label || "ICF-code"}</span>
            </div>
            <span className="text-xs text-muted-foreground">{Math.round((item.confidence || 0) * 100)}%</span>
          </div>
          {!!item.evidence?.length && (
            <p className="text-xs text-muted-foreground mt-1">Evidence: {item.evidence.join(", ")}</p>
          )}
        </div>
      ))}
    </div>
  );
}

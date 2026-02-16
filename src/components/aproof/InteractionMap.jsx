function edgeOpacity(confidence) {
  const c = Number(confidence ?? 0.5);
  return Math.max(0.25, Math.min(1, c));
}

function edgeWidth(confidence) {
  const c = Number(confidence ?? 0.5);
  return 1.2 + c * 4;
}

function shortLabel(text, max = 22) {
  const t = String(text || "");
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export default function InteractionMap({
  events = [],
  selectedEventId,
  onSelectEvent,
  topIcfCodes = [],
  contextFactors = [],
}) {
  if (!events.length && !topIcfCodes.length) {
    return <div className="text-sm text-muted-foreground">De interactiekaart verschijnt zodra ICF-inzichten binnenkomen.</div>;
  }

  const activeEvent =
    events.find((e) => e.id === selectedEventId) ||
    events[events.length - 1] ||
    null;

  const activeCodes =
    activeEvent?.topCodes?.length > 0
      ? activeEvent.topCodes.slice(0, 8)
      : topIcfCodes.slice(0, 8);

  const width = 900;
  const height = 360;

  const nodes = {
    patient: { x: 110, y: 90, label: "Patient" },
    leo: { x: 110, y: 270, label: "Leo" },
    icfHub: { x: 430, y: 110, label: "ICF Engine" },
    fac: { x: 430, y: 270, label: "FAC d450" },
    clinical: { x: 760, y: 190, label: "Klinisch" },
  };

  const codeNodes = activeCodes.map((item, idx) => {
    const perCol = 4;
    const col = Math.floor(idx / perCol);
    const row = idx % perCol;
    return {
      ...item,
      x: 590 + col * 120,
      y: 65 + row * 76,
    };
  });

  return (
    <div className="space-y-3">
      {events.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {events.slice(-12).map((event) => {
            const active = event.id === activeEvent?.id;
            return (
              <button
                key={event.id}
                type="button"
                onClick={() => onSelectEvent?.(event.id)}
                className={`text-[11px] px-2 py-1 rounded-full border ${
                  active
                    ? "border-aproof-teal bg-aproof-teal/10 text-aproof-teal"
                    : "border-border bg-white text-muted-foreground"
                }`}
                title={event.text}
              >
                Turn {event.turnIndex}
              </button>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-border bg-white/80 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[760px] h-[360px]">
          <defs>
            <linearGradient id="edgeGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#29C4A9" />
              <stop offset="100%" stopColor="#EC5851" />
            </linearGradient>
          </defs>

          {activeCodes.map((code) => (
            <g key={`edge-p-${code.code}`}>
              <line
                x1={nodes.patient.x + 36}
                y1={nodes.patient.y}
                x2={code.x - 34}
                y2={code.y}
                stroke="url(#edgeGrad)"
                strokeWidth={edgeWidth(code.confidence)}
                opacity={edgeOpacity(code.confidence)}
              />
              <title>{`${code.code} · ${Math.round((code.confidence || 0) * 100)}%`}</title>
            </g>
          ))}

          {codeNodes.map((code) => (
            <g key={`edge-h-${code.code}`}>
              <line
                x1={code.x - 28}
                y1={code.y}
                x2={nodes.icfHub.x + 35}
                y2={nodes.icfHub.y}
                stroke="#2EA3F2"
                strokeWidth={1.2}
                opacity={0.45}
                strokeDasharray="4 4"
              />
            </g>
          ))}

          {activeCodes
            .filter((code) => code.code === "d450")
            .map((code) => (
              <line
                key="edge-fac"
                x1={code.x - 18}
                y1={code.y + 14}
                x2={nodes.fac.x + 35}
                y2={nodes.fac.y}
                stroke="#EC5851"
                strokeWidth={2.2}
                opacity={0.72}
              />
            ))}

          <line
            x1={nodes.icfHub.x + 38}
            y1={nodes.icfHub.y}
            x2={nodes.clinical.x - 40}
            y2={nodes.clinical.y}
            stroke="#2EA3F2"
            strokeWidth={2.2}
            opacity={0.6}
          />

          <line
            x1={nodes.fac.x + 35}
            y1={nodes.fac.y}
            x2={nodes.clinical.x - 45}
            y2={nodes.clinical.y + 25}
            stroke="#EC5851"
            strokeWidth={2.2}
            opacity={0.55}
          />

          {Object.entries(nodes).map(([id, node]) => (
            <g key={id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={34}
                fill={id === "patient" ? "#29C4A9" : id === "clinical" ? "#EC5851" : "#ffffff"}
                opacity={id === "patient" || id === "clinical" ? 0.18 : 1}
                stroke={id === "patient" ? "#29C4A9" : id === "clinical" ? "#EC5851" : "#D8CDC0"}
                strokeWidth={2}
              />
              <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize="11" fill="#111111" fontWeight="600">
                {node.label}
              </text>
            </g>
          ))}

          {codeNodes.map((code) => (
            <g key={code.code}>
              <circle
                cx={code.x}
                cy={code.y}
                r={27}
                fill="#ffffff"
                stroke={Number(code.confidence || 0) < 0.55 ? "#EC5851" : "#29C4A9"}
                strokeWidth={2}
              />
              <text x={code.x} y={code.y + 3} textAnchor="middle" fontSize="10" fill="#111111" fontWeight="700">
                {code.code}
              </text>
              <text x={code.x} y={code.y + 18} textAnchor="middle" fontSize="9" fill="#666">
                {Math.round((code.confidence || 0) * 100)}%
              </text>
              <title>{`${code.code} - ${code.label || "ICF"}\n${(code.evidence || []).join(", ")}`}</title>
            </g>
          ))}

          {contextFactors.slice(0, 2).map((factor, idx) => (
            <g key={`${factor.code}-${idx}`}>
              <rect x={250} y={250 + idx * 40} width={130} height={28} rx={8} fill="#F8F3EC" stroke="#D8CDC0" />
              <text x={315} y={268 + idx * 40} textAnchor="middle" fontSize="10" fill="#444" fontWeight="600">
                {factor.code} {shortLabel(factor.label, 14)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <p className="text-xs text-muted-foreground">
        Kaart toont live sessie-relaties: patiëntspraak → ICF-code → klinisch overzicht. Klik op een turn om context te wisselen.
      </p>
    </div>
  );
}

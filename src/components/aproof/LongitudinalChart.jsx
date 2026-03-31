import { APROOF_DOMAINS } from "@/lib/aproof-domains";

const MOCK_SESSIONS = [
  { label: "Week 1", date: "2026-02-15", domains: { b1300: 1, b440: 1, d450: 1, b455: 1, b152: 2 } },
  { label: "Week 3", date: "2026-03-01", domains: { b1300: 2, b440: 2, d450: 2, b455: 2, b152: 2 } },
  { label: "Week 6", date: "2026-03-15", domains: { b1300: 2, b440: 3, d450: 3, b455: 3, b152: 3 } },
];

function TrendArrow({ prev, curr }) {
  if (curr > prev) return <span className="text-green-500">↑</span>;
  if (curr < prev) return <span className="text-red-500">↓</span>;
  return <span className="text-muted-foreground">→</span>;
}

export default function LongitudinalChart({ currentDomainLevels = {} }) {
  const sessions = [
    ...MOCK_SESSIONS,
    { label: "Today", date: new Date().toISOString().slice(0, 10), domains: {} },
  ];

  for (const [code, result] of Object.entries(currentDomainLevels)) {
    if (result?.level != null) {
      sessions[sessions.length - 1].domains[code] = result.level;
    }
  }

  const allCodes = new Set();
  sessions.forEach((s) => Object.keys(s.domains).forEach((c) => allCodes.add(c)));
  const domainMap = Object.fromEntries(APROOF_DOMAINS.map((d) => [d.code, d]));
  const visibleDomains = [...allCodes].filter((c) => domainMap[c]).sort();

  if (visibleDomains.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Trend data will appear once domains are scored.
      </p>
    );
  }

  return (
    <div>
      <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded px-3 py-2 mb-4">
        Simulated trend — past sessions are mock data for demonstration purposes only.
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 pr-4 text-xs font-semibold text-muted-foreground">Domain</th>
              {sessions.map((s, i) => (
                <th key={i} className={`text-center py-2 px-3 text-xs font-semibold ${i === sessions.length - 1 ? "text-aproof-teal" : "text-muted-foreground"}`}>
                  {s.label}
                </th>
              ))}
              <th className="text-center py-2 px-2 text-xs font-semibold text-muted-foreground">Trend</th>
            </tr>
          </thead>
          <tbody>
            {visibleDomains.map((code) => {
              const domain = domainMap[code];
              const values = sessions.map((s) => s.domains[code] ?? null);
              const lastTwo = values.filter((v) => v != null).slice(-2);

              return (
                <tr key={code} className="border-b border-border/50">
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: domain.color }} />
                      <span className="font-medium">{domain.name}</span>
                    </div>
                  </td>
                  {values.map((v, i) => (
                    <td key={i} className={`text-center py-2 px-3 tabular-nums ${i === sessions.length - 1 ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                      {v != null ? `${v}/${domain.maxLevel}` : "—"}
                    </td>
                  ))}
                  <td className="text-center py-2 px-2 text-lg">
                    {lastTwo.length === 2 ? <TrendArrow prev={lastTwo[0]} curr={lastTwo[1]} /> : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

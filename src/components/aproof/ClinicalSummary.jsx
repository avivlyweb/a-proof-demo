import { APROOF_DOMAINS, getSeverityLabel } from "@/lib/aproof-domains";

const DOMAIN_ACTIONS = {
  b1300: "Bespreek energiemanagement en spreiding van activiteiten.",
  b140: "Screen concentratieproblemen en evalueer prikkelbelasting.",
  b152: "Monitor stemming en overweeg psychosociale ondersteuning.",
  b440: "Controleer benauwdheidsklachten en belastbaarheid in ADL.",
  b455: "Overweeg conditie-opbouw met afgestemde oefenintensiteit.",
  b530: "Bespreek voedingspatroon en gewichtsverloop.",
  d450: "Overweeg valrisico-assessment en passend loophulpmiddel.",
  d550: "Evalueer zelfstandigheid bij eten en praktische barrières.",
  d840: "Bespreek belastbaarheid bij werk en dagelijkse rollen.",
};

export default function ClinicalSummary({ domainLevels = {}, summary = "" }) {
  const detected = APROOF_DOMAINS.filter(
    (d) => domainLevels[d.code]?.level !== null && domainLevels[d.code]?.level !== undefined
  );
  const lowConfidence = detected.filter((d) => (domainLevels[d.code]?.confidence ?? 1) < 0.55);
  const topDomains = [...detected]
    .sort((a, b) => {
      const aLevel = domainLevels[a.code]?.level ?? 0;
      const bLevel = domainLevels[b.code]?.level ?? 0;
      const aSeverity = a.code === "d450" ? a.maxLevel - aLevel : aLevel;
      const bSeverity = b.code === "d450" ? b.maxLevel - bLevel : bLevel;
      return bSeverity - aSeverity;
    })
    .slice(0, 3);

  if (detected.length === 0 && !summary) return null;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Patiëntperspectief</h3>
        <p className="text-sm text-foreground leading-relaxed">
          {summary || "Nog geen samenvatting beschikbaar. Voer eerst een kort gesprek."}
        </p>
      </div>

      {detected.length > 0 && (
        <div className="overflow-x-auto space-y-4">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">ICF-classificatie</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="py-2 pr-4 font-semibold text-muted-foreground">Domein</th>
                <th className="py-2 pr-4 font-semibold text-muted-foreground">Code</th>
                <th className="py-2 pr-4 font-semibold text-muted-foreground">Niveau</th>
                <th className="py-2 pr-4 font-semibold text-muted-foreground">Ernst</th>
                <th className="py-2 font-semibold text-muted-foreground">Betrouwbaarheid</th>
              </tr>
            </thead>
            <tbody>
              {detected.map((domain) => {
                const r = domainLevels[domain.code];
                const severity = getSeverityLabel(r.level, domain.maxLevel, domain.code);
                const isLowConfidence = (r.confidence ?? 1) < 0.55;
                return (
                  <tr key={domain.code} className="border-b border-border/50">
                    <td className="py-2 pr-4 font-medium">{domain.name}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{domain.code}</td>
                    <td className="py-2 pr-4">
                      {r.level}/{domain.maxLevel}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">{severity.label}</td>
                    <td className="py-2 text-muted-foreground">
                      {r.confidence != null
                        ? `${Math.round(r.confidence * 100)}%${isLowConfidence ? " [verify with clinician]" : ""}`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {topDomains.length > 0 && (
            <div>
              <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Aanbevolen acties</h3>
              <ul className="space-y-1.5 text-sm text-foreground">
                {topDomains.map((domain) => (
                  <li key={domain.code}>
                    {domain.code}: {DOMAIN_ACTIONS[domain.code] || "Bespreek dit domein gericht in het vervolggesprek."}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lowConfidence.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Let op: een of meer inschattingen hebben lage confidence en vereisen klinische verificatie.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

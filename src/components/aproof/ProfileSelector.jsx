import { PATIENT_PROFILES } from "@/lib/aproof-profiles";

export default function ProfileSelector({ selectedId, onSelect, disabled }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {PATIENT_PROFILES.map((profile) => {
        const isSelected = selectedId === profile.id;
        return (
          <button
            key={profile.id}
            onClick={() => onSelect(profile.id)}
            disabled={disabled}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              isSelected
                ? "border-aproof-teal bg-aproof-teal/10 shadow-md"
                : "border-border hover:border-aproof-teal/40 bg-background"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <div className="text-2xl mb-2">{profile.icon}</div>
            <div className="text-sm font-semibold">{profile.name}</div>
            <div className="text-xs text-muted-foreground mt-1">{profile.description}</div>
          </button>
        );
      })}
    </div>
  );
}

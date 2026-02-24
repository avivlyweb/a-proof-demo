import { useState } from "react";
import { Button } from "@/components/ui/button";

const ISSUE_OPTIONS = [
  "taal_drift",
  "rol_onduidelijk",
  "icf_onjuist",
  "samenvatting_onduidelijk",
  "spraakproblemen",
  "ux_onduidelijk",
];

export default function FeedbackPanel({
  sessionId,
  consent,
  onConsentChange,
  onSaveSession,
  onSubmitFeedback,
  isSavingSession,
  isSubmittingFeedback,
  saveStatus,
  feedbackStatus,
}) {
  const [rating, setRating] = useState(4);
  const [issues, setIssues] = useState([]);
  const [worked, setWorked] = useState("");
  const [failed, setFailed] = useState("");
  const [suggestions, setSuggestions] = useState("");

  const toggleIssue = (value) => {
    setIssues((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const submitFeedback = async () => {
    await onSubmitFeedback?.({
      session_id: sessionId,
      rating,
      issues,
      what_worked: worked,
      what_failed: failed,
      suggestions,
      consent,
      source: "demo",
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Help het A-PROOF team verbeteren: sla deze testsessie op en geef feedback.
      </p>

      <label className="flex items-start gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={consent}
          onChange={(e) => onConsentChange?.(e.target.checked)}
        />
        Ik ga akkoord dat deze testsessie en feedback intern worden opgeslagen voor productverbetering.
      </label>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={onSaveSession}
          disabled={!consent || isSavingSession}
          className="bg-aproof-teal hover:bg-aproof-teal/85"
        >
          {isSavingSession ? "Sessie opslaan..." : "Sla testsessie op"}
        </Button>
        {saveStatus && <span className="text-xs text-muted-foreground self-center">{saveStatus}</span>}
      </div>

      <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Score (1-5)</label>
          <div className="mt-1 flex gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                className={`h-8 w-8 rounded-full border text-sm ${
                  rating === value
                    ? "bg-aproof-coral text-white border-aproof-coral"
                    : "bg-white border-border text-foreground"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Probleemtype</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {ISSUE_OPTIONS.map((issue) => (
              <button
                key={issue}
                type="button"
                onClick={() => toggleIssue(issue)}
                className={`text-xs px-2.5 py-1 rounded-full border ${
                  issues.includes(issue)
                    ? "border-aproof-teal bg-aproof-teal/10 text-aproof-teal"
                    : "border-border bg-white text-muted-foreground"
                }`}
              >
                {issue}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Wat werkte goed?</label>
          <textarea
            value={worked}
            onChange={(e) => setWorked(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-white p-2 text-sm"
            rows={2}
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Wat ging mis?</label>
          <textarea
            value={failed}
            onChange={(e) => setFailed(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-white p-2 text-sm"
            rows={2}
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-muted-foreground">Suggestie</label>
          <textarea
            value={suggestions}
            onChange={(e) => setSuggestions(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-white p-2 text-sm"
            rows={2}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={submitFeedback}
            disabled={!consent || isSubmittingFeedback}
            className="bg-aproof-coral hover:bg-aproof-coral/85"
          >
            {isSubmittingFeedback ? "Feedback versturen..." : "Verstuur feedback"}
          </Button>
          {feedbackStatus && <span className="text-xs text-muted-foreground">{feedbackStatus}</span>}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("nl-NL", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Review() {
  const [sessions, setSessions] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [sessionRows, feedbackRows] = await Promise.all([
        base44.entities.TestSession.list("-created_date", 200),
        base44.entities.TesterFeedback.list("-created_date", 500),
      ]);
      setSessions(Array.isArray(sessionRows) ? sessionRows : []);
      setFeedback(Array.isArray(feedbackRows) ? feedbackRows : []);
    } catch (err) {
      console.error("Failed to load review data:", err);
      setError("Kon reviewdata niet laden.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const feedbackBySession = useMemo(() => {
    const map = new Map();
    for (const item of feedback) {
      const key = item?.session_id;
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return map;
  }, [feedback]);

  return (
    <div className="min-h-screen aproof-dashboard-bg text-foreground">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <Link to="/demo" className="text-sm text-muted-foreground hover:text-foreground underline">
            Terug naar demo
          </Link>
          <h1 className="text-lg font-bold text-aproof-coral">A-PROOF Review</h1>
          <Button variant="ghost" onClick={loadData} disabled={loading}>
            {loading ? "Laden..." : "Vernieuwen"}
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <Card className="aproof-panel aproof-appear">
          <CardContent>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Overzicht</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="aproof-chip">Sessies: {sessions.length}</span>
              <span className="aproof-chip">Feedback items: {feedback.length}</span>
            </div>
            {error && <p className="text-sm text-aproof-coral mt-3">{error}</p>}
          </CardContent>
        </Card>

        <Card className="aproof-panel aproof-appear">
          <CardContent>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Testsessies</h2>
            {loading ? (
              <p className="text-sm text-muted-foreground">Data laden...</p>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nog geen opgeslagen testsessies.</p>
            ) : (
              <div className="space-y-3">
                {sessions.map((session) => {
                  const rows = feedbackBySession.get(session.session_id) || [];
                  const avgRating =
                    rows.length > 0
                      ? Math.round((rows.reduce((sum, r) => sum + Number(r.rating || 0), 0) / rows.length) * 10) / 10
                      : null;
                  return (
                    <div key={session.id} className="rounded-xl border border-border bg-white p-3">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="aproof-chip">{session.session_id}</span>
                        <span className="text-xs text-muted-foreground">Start: {formatDate(session.started_at)}</span>
                        <span className="text-xs text-muted-foreground">Einde: {formatDate(session.ended_at)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                        <span>Transcript turns: {Array.isArray(session.transcript) ? session.transcript.length : 0}</span>
                        <span>Insights: {Array.isArray(session.insight_events) ? session.insight_events.length : 0}</span>
                        <span>Top codes: {Array.isArray(session.top_icf_codes) ? session.top_icf_codes.length : 0}</span>
                        <span>Feedback: {rows.length}</span>
                        {avgRating != null && <span>Gem. score: {avgRating}/5</span>}
                      </div>
                      {rows.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {rows.slice(0, 2).map((item) => (
                            <div key={item.id} className="text-xs text-foreground bg-muted/30 rounded px-2 py-1">
                              [{item.rating}/5] {(item.what_failed || item.suggestions || item.what_worked || "Feedback zonder notitie").slice(0, 180)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

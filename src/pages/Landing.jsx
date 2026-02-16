import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { APROOF_DOMAINS } from "@/lib/aproof-domains";
import {
  MessageCircle,
  Heart,
  Brain,
  ArrowRight,
  ExternalLink,
  Users,
  Stethoscope,
  GraduationCap,
  Mic,
  ChevronDown,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Animated conversation simulation for the "Twee werelden" section.
// Left: warm Leo conversation. Right: clinical ICF analysis appearing.
// ---------------------------------------------------------------------------
const CONVERSATION = [
  {
    speaker: "leo",
    text: "Goedemiddag mevrouw Jansen! Fijn dat u er bent. Hoe gaat het vandaag met u?",
    delay: 0,
  },
  {
    speaker: "patient",
    text: "Ach, het gaat wel. Maar ik ben de laatste tijd zo moe, ik kom de dag bijna niet door.",
    delay: 2400,
    icf: { code: "b1300", label: "Energie", level: "1/4", confidence: "0.89" },
  },
  {
    speaker: "leo",
    text: "Dat klinkt alsof het u veel energie kost. Merkt u dat vooral overdag, of ook al bij het opstaan?",
    delay: 5200,
  },
  {
    speaker: "patient",
    text: "Al bij het opstaan eigenlijk. En lopen naar de supermarkt durf ik niet meer alleen, ik ben bang dat ik val.",
    delay: 8000,
    icf: { code: "d450", label: "Lopen", level: "2/5", confidence: "0.92" },
    icf2: { code: "b152", label: "Emotioneel", level: "2/4", confidence: "0.78" },
  },
  {
    speaker: "leo",
    text: "Die onzekerheid is heel vervelend. U vertelde dat u graag naar de markt gaat — gaat uw kleindochter Anna soms met u mee?",
    delay: 11500,
  },
];

function AnimatedConversation() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsInView(true);
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isInView) return;
    const timers = CONVERSATION.map((msg, i) =>
      setTimeout(() => setVisibleCount(i + 1), msg.delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [isInView]);

  const visibleMessages = CONVERSATION.slice(0, visibleCount);
  const icfEntries = visibleMessages.filter((m) => m.icf);

  return (
    <div ref={ref} className="grid lg:grid-cols-2 gap-0 lg:gap-0 rounded-3xl overflow-hidden shadow-xl">
      {/* Left — warm conversation */}
      <div className="bg-white p-6 sm:p-8 lg:p-10 min-h-[420px]">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-aproof-cream">
          <div className="w-10 h-10 rounded-full bg-aproof-teal-light flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-aproof-teal" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Leo</p>
            <p className="text-[11px] text-muted-foreground">Gesprekspartner</p>
          </div>
        </div>

        <div className="space-y-4">
          {visibleMessages.map((msg, i) => (
            <div
              key={i}
              className={`flex animate-fade-slide-up ${msg.speaker === "patient" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.speaker === "patient"
                    ? "bg-aproof-cream text-foreground rounded-br-md"
                    : "bg-aproof-teal-light text-foreground rounded-bl-md"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {visibleCount < CONVERSATION.length && isInView && (
            <div className="flex items-center gap-1.5 pl-2">
              <span className="w-2 h-2 rounded-full bg-aproof-teal animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-aproof-teal animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-aproof-teal animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          )}
        </div>
      </div>

      {/* Right — clinical analysis appearing */}
      <div className="bg-aproof-dark p-6 sm:p-8 lg:p-10 min-h-[420px]">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-full bg-aproof-coral-light flex items-center justify-center">
            <Brain className="w-5 h-5 text-aproof-coral" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Klinische Analyse</p>
            <p className="text-[11px] text-white/50">WHO-ICF classificatie</p>
          </div>
        </div>

        {icfEntries.length === 0 ? (
          <div className="flex items-center justify-center h-48">
            <p className="text-white/30 text-sm italic">Wacht op spraakherkenning...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {icfEntries.map((msg, i) => (
              <div key={i} className="animate-fade-slide-up">
                {/* Primary ICF detection */}
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-aproof-teal">{msg.icf.code}</span>
                    <span className="text-[10px] text-white/40">
                      confidence: {msg.icf.confidence}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white font-medium">{msg.icf.label}</span>
                    <span className="text-sm font-mono text-aproof-coral font-semibold">
                      {msg.icf.level}
                    </span>
                  </div>
                  {/* Bar */}
                  <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-aproof-coral transition-all duration-1000"
                      style={{ width: `${(parseInt(msg.icf.level) / parseInt(msg.icf.level.split("/")[1])) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Secondary ICF if present */}
                {msg.icf2 && (
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10 mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-aproof-teal">{msg.icf2.code}</span>
                      <span className="text-[10px] text-white/40">
                        confidence: {msg.icf2.confidence}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white font-medium">{msg.icf2.label}</span>
                      <span className="text-sm font-mono text-aproof-coral font-semibold">
                        {msg.icf2.level}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-aproof-coral transition-all duration-1000"
                        style={{ width: `${(parseInt(msg.icf2.level) / parseInt(msg.icf2.level.split("/")[1])) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Evidence quote */}
                <p className="text-[11px] text-white/30 mt-2 pl-1 italic truncate">
                  &ldquo;{msg.text.substring(0, 60)}...&rdquo;
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Floating domain orbs — subtle background element
// ---------------------------------------------------------------------------
function DomainOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
      {APROOF_DOMAINS.map((d, i) => (
        <div
          key={d.code}
          className="absolute rounded-full opacity-[0.07]"
          style={{
            width: `${60 + i * 12}px`,
            height: `${60 + i * 12}px`,
            backgroundColor: d.color,
            top: `${10 + (i * 37) % 80}%`,
            left: `${5 + (i * 43) % 85}%`,
            animation: `float ${6 + i * 0.8}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.4}s`,
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Landing page
// ---------------------------------------------------------------------------
export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Animations defined in index.css */}

      {/* ================================================================= */}
      {/* HERO                                                              */}
      {/* ================================================================= */}
      <section className="relative min-h-[92vh] flex flex-col items-center justify-center px-6 text-center">
        <DomainOrbs />

        <div className="relative z-10 max-w-3xl mx-auto animate-fade-slide-up-slow">
          {/* Leo avatar */}
          <div
            className="mx-auto mb-8 w-20 h-20 rounded-full flex items-center justify-center shadow-lg animate-pulse-glow"
            style={{ background: "linear-gradient(135deg, #29C4A9, #29C4A9aa)" }}
          >
            <Heart className="w-9 h-9 text-white" />
          </div>

          <p className="text-sm font-semibold tracking-[0.2em] uppercase text-aproof-teal mb-4">
            Maak kennis met Leo — uw gesprekspartner
          </p>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
            Een gesprek dat{" "}
            <span className="text-aproof-coral">luistert</span>,{" "}
            <br className="hidden sm:block" />
            een analyse die{" "}
            <span className="text-aproof-teal">begrijpt</span>
          </h1>

          <p className="text-lg sm:text-xl text-foreground/60 max-w-xl mx-auto leading-relaxed mb-10">
            Leo is een warme, geduldige gesprekspartner voor ouderen.
            Onzichtbaar structureert hij het gesprek volgens het WHO-ICF model
            &mdash; zodat zorgverleners direct inzicht krijgen.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="https://aproof-demo-31cd424c.base44.app/demo">
              <Button className="h-14 px-10 text-base rounded-full bg-aproof-coral hover:bg-aproof-coral-85 text-white shadow-lg hover:shadow-xl transition-all">
                <Mic className="w-5 h-5 mr-2" />
                Start het gesprek
              </Button>
            </a>
            <a href="#hoe-werkt-leo" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              Meer ontdekken
              <ChevronDown className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 animate-bounce text-foreground/20">
          <ChevronDown className="w-6 h-6" />
        </div>
      </section>

      {/* ================================================================= */}
      {/* HOE WERKT LEO — 3 steps                                           */}
      {/* ================================================================= */}
      <section id="hoe-werkt-leo" className="py-24 sm:py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm font-semibold tracking-[0.15em] uppercase text-aproof-teal text-center mb-3">
            Van gesprek naar inzicht
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Hoe werkt Leo?
          </h2>
          <p className="text-center text-muted-foreground max-w-lg mx-auto mb-16">
            Drie stappen &mdash; voor de gebruiker voelt het als een prettig gesprek.
            De klinische analyse gebeurt op de achtergrond.
          </p>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-10">
            {[
              {
                icon: MessageCircle,
                color: "#29C4A9",
                step: "01",
                title: "Praat",
                desc: "Vertel gewoon hoe het gaat. Leo stelt warme, open vragen in eenvoudig Nederlands. Geen vragenlijsten, geen formulieren.",
              },
              {
                icon: Heart,
                color: "#EC5851",
                step: "02",
                title: "Luister",
                desc: "Leo onthoudt namen, herkent emoties en verwijst terug naar wat u eerder vertelde. Elke reactie is persoonlijk en oprecht.",
              },
              {
                icon: Brain,
                color: "#29C4A9",
                step: "03",
                title: "Begrijp",
                desc: "Op de achtergrond koppelt AI uw verhaal aan 9 ICF-domeinen met ernstscores, confidence levels en klinische aanbevelingen.",
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="relative mx-auto mb-6">
                  <div
                    className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}12` }}
                  >
                    <item.icon className="w-7 h-7" style={{ color: item.color }} />
                  </div>
                  <span
                    className="absolute -top-2 -right-2 w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center text-white"
                    style={{ backgroundColor: item.color }}
                  >
                    {item.step}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* TWEE WERELDEN — animated dual conversation                        */}
      {/* ================================================================= */}
      <section className="py-24 sm:py-32 px-6 bg-aproof-warm">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm font-semibold tracking-[0.15em] uppercase text-aproof-coral text-center mb-3">
            De kracht van Leo
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            Twee werelden, <span className="text-aproof-coral">een gesprek</span>
          </h2>
          <p className="text-center text-muted-foreground max-w-xl mx-auto mb-14">
            Links: wat mevrouw Jansen ervaart &mdash; een warm, menselijk gesprek.
            Rechts: wat de zorgverlener ontvangt &mdash; gestructureerde ICF-classificatie.
          </p>

          <AnimatedConversation />
        </div>
      </section>

      {/* ================================================================= */}
      {/* DE 9 DOMEINEN — subtle horizontal strip                           */}
      {/* ================================================================= */}
      <section className="py-24 sm:py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-sm font-semibold tracking-[0.15em] uppercase text-aproof-teal text-center mb-3">
            WHO-ICF classificatie
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            9 domeinen, onzichtbaar in kaart gebracht
          </h2>
          <p className="text-center text-muted-foreground max-w-lg mx-auto mb-14">
            Terwijl Leo luistert, analyseert het model continu op deze
            functioneringsdomeinen. De oudere merkt hier niets van.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {APROOF_DOMAINS.map((domain) => (
              <div
                key={domain.code}
                className="group bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border border-transparent hover:border-aproof-cream"
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: domain.color }}
                  >
                    {domain.repo}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-base font-semibold">{domain.name}</h3>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {domain.code}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {domain.description}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      {Array.from({ length: domain.maxLevel + 1 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-1 flex-1 rounded-full transition-opacity"
                          style={{
                            backgroundColor: domain.color,
                            opacity: 0.15 + (i / domain.maxLevel) * 0.65,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* VOOR WIE — audience cards                                         */}
      {/* ================================================================= */}
      <section className="py-24 sm:py-32 px-6 bg-aproof-warm">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm font-semibold tracking-[0.15em] uppercase text-aproof-coral text-center mb-3">
            Voor iedereen in de zorgketen
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-14">
            Voor wie is Leo?
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Users,
                color: "#29C4A9",
                title: "Ouderen",
                points: [
                  "Een prettige, rustige gesprekspartner",
                  "Geen ingewikkelde vragenlijsten",
                  "Onthoudt uw naam en uw verhaal",
                  "Spreekt eenvoudig en duidelijk Nederlands",
                ],
              },
              {
                icon: Stethoscope,
                color: "#EC5851",
                title: "Zorgverleners",
                points: [
                  "Gestructureerde ICF-rapporten",
                  "Ernstinschattingen met confidence scores",
                  "FAC-niveau en valrisico-indicatie",
                  "Interventieaanbevelingen (KNGF 2025)",
                ],
              },
              {
                icon: GraduationCap,
                color: "#2EA3F2",
                title: "Onderzoekers",
                points: [
                  "Gebouwd op A-PROOF (VU Amsterdam)",
                  "9 WHO-ICF domeinen, wetenschappelijk onderbouwd",
                  "Open-source ICF classifier",
                  "Real-time NLP op gesproken taal",
                ],
              },
            ].map((card, i) => (
              <Card key={i} className="bg-white border-none shadow-md hover:shadow-lg transition-shadow">
                <CardContent className="pt-8 pb-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ backgroundColor: `${card.color}12` }}
                  >
                    <card.icon className="w-6 h-6" style={{ color: card.color }} />
                  </div>
                  <h3 className="text-lg font-semibold mb-4">{card.title}</h3>
                  <ul className="space-y-2.5">
                    {card.points.map((point, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5"
                          style={{ backgroundColor: card.color }}
                        />
                        {point}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* EMPATHIE PRINCIPES — what makes Leo special                        */}
      {/* ================================================================= */}
      <section className="py-24 sm:py-32 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-semibold tracking-[0.15em] uppercase text-aproof-teal mb-3">
            Compassie als kernprincipe
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold mb-14">
            Geen vragenlijst.<br />
            Een <span className="text-aproof-coral">echt gesprek</span>.
          </h2>

          <div className="grid sm:grid-cols-2 gap-6 text-left">
            {[
              {
                title: "Contextueel geheugen",
                desc: "Leo onthoudt dat uw kleindochter Anna heet, dat u graag in de tuin werkt, en dat u vorige week last had van uw knie. Elk gesprek bouwt voort.",
              },
              {
                title: "Gelaagde empathie",
                desc: "Geen robotische herhalingen. Leo herkent frustratie, trots of verdriet en past zijn toon en vragen daar op aan &mdash; subtiel en natuurlijk.",
              },
              {
                title: "Natuurlijke bruggen",
                desc: "\"Als u zich zo moe voelt na het boodschappen doen, heeft dat dan ook invloed op hoe u slaapt 's nachts?\" Domeinen vloeien in elkaar over.",
              },
              {
                title: "De persoon centraal",
                desc: "Het gesprek moet voelen als een prettige, zinvolle interactie. Niet als een interview. Niet als een formulier. Gewoon een goed gesprek.",
              },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-base font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: item.desc }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* ONDERZOEK & BRONNEN                                               */}
      {/* ================================================================= */}
      <section className="py-24 sm:py-32 px-6 bg-aproof-warm">
        <div className="max-w-4xl mx-auto">
          <p className="text-sm font-semibold tracking-[0.15em] uppercase text-aproof-teal text-center mb-3">
            Wetenschappelijk onderbouwd
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-14">
            Onderzoek &amp; bronnen
          </h2>

          <div className="grid sm:grid-cols-3 gap-5 mb-8">
            {[
              {
                href: "https://cltl.github.io/a-proof-project/",
                tag: "Project",
                tagColor: "#29C4A9",
                title: "A-PROOF Project",
                desc: "Publicaties, datasets en achtergrond van het VU Amsterdam onderzoek.",
              },
              {
                href: "https://github.com/cltl/aproof-icf-classifier",
                tag: "Open Source",
                tagColor: "#29C4A9",
                title: "ICF Classifier",
                desc: "De open-source GitHub-repository met het classificatiemodel.",
              },
              {
                href: "https://aproof.ai",
                tag: "Website",
                tagColor: "#EC5851",
                title: "aproof.ai",
                desc: "De officiele A-PROOF website met productinformatie.",
              },
            ].map((link, i) => (
              <a key={i} href={link.href} target="_blank" rel="noopener noreferrer" className="group">
                <Card className="bg-white border-none shadow-sm hover:shadow-md transition-all h-full">
                  <CardContent className="space-y-3 pt-6">
                    <div className="flex items-center justify-between">
                      <span
                        className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: link.tagColor }}
                      >
                        {link.tag}
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-aproof-teal transition-colors" />
                    </div>
                    <h3 className="text-base font-semibold">{link.title}</h3>
                    <p className="text-sm text-muted-foreground">{link.desc}</p>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              Vossen, P., Menger, V., Bajwa, M., et al. (2022). &ldquo;A-PROOF:
              Automatic Prediction of Recovery of Functioning from Dutch Clinical
              Text.&rdquo; Computational Linguistics in the Netherlands Journal
              (CLIN), 12, 117&ndash;137.
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* FOOTER CTA                                                        */}
      {/* ================================================================= */}
      <footer className="py-24 sm:py-32 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <div
            className="mx-auto mb-8 w-16 h-16 rounded-full bg-aproof-coral/10 flex items-center justify-center"
          >
            <Mic className="w-7 h-7 text-aproof-coral" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Klaar om Leo te ontmoeten?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Ervaar zelf hoe een warm gesprek automatisch leidt tot klinische
            inzichten. Spreek Nederlands en zie de ICF-domeinen live verschijnen.
          </p>
          <a href="https://aproof-demo-31cd424c.base44.app/demo">
            <Button className="h-14 px-10 text-base rounded-full bg-aproof-coral hover:bg-aproof-coral-85 text-white shadow-lg hover:shadow-xl transition-all">
              Start het gesprek
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </a>
          <p className="text-xs text-muted-foreground mt-16">
            A-PROOF &mdash; VU Amsterdam / CLTL &mdash; Gebouwd met{" "}
            <a href="https://base44.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">
              Base44
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

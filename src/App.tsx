import { useState, useRef, useEffect, useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

// ─── Tokens ──────────────────────────────────────────────────────────────────
const T = {
  sage: '#6E9E82',
  sageDark: '#3D6B52',
  sageMid: '#8FB8A0',
  sagePale: '#EAF2ED',
  sageMist: '#F4F8F5',
  teal: '#4A8A7C',
  dust: '#C4AFA0',
  blush: '#EFE3D8',
  lav: '#9490C4',
  lavPale: '#EDEAF8',
  ink: '#192820',
  inkMid: '#3D5246',
  inkSoft: '#7A9484',
  border: '#DDE9E2',
  surface: '#F6F9F7',
  white: '#FFFFFF',
};

// ─── Fixtures Data ────────────────────────────────────────────────────────────
const DATA = {
  learner: { initials: "NA", displayName: "Nadia A. · profil fictif", context: "Équipe officinale · Casablanca" },
  course: {
    eyebrow: "Communication en pharmacie",
    title: "Mieux accueillir et expliquer en pharmacie",
    description: "Entraîne-toi à demander la langue préférée, expliquer une étape à la fois et vérifier la compréhension avec respect.",
    duration: "15 minutes",
    level: "Fondamentaux",
  },
  preparation: [
    { id: "langue", title: "Demander la langue préférée", body: "Proposer un français simple ou une explication orale en darija, sans supposer la préférence de la personne." },
    { id: "expliquer", title: "Expliquer simplement", body: "Présenter une étape à la fois, éviter le jargon et utiliser un exemple concret du quotidien." },
    { id: "comprendre", title: "Vérifier la compréhension", body: "Inviter la personne à reformuler, accueillir ses questions et noter clairement la prochaine étape." },
  ],
  scenario: {
    customer: "Cliente fictive · Casablanca",
    context: "Une cliente souhaite comprendre des consignes générales affichées dans l’espace conseil. Elle lit le français, mais préfère parfois une explication orale en darija.",
    goal: "Demande sa préférence, explique par étapes et vérifie ce qu’elle a compris, sans formuler de conseil clinique.",
  },
  dialogue: [
    {
      speaker: "customer",
      text: "Je lis le français, mais je comprends mieux certaines explications en darija. Est-ce possible ?",
      choices: [
        "Bien sûr. Préférez-vous que nous commencions en français simple ou par une explication orale en darija ?",
        "Tout est déjà écrit en français sur l’affiche.",
        "Je vais choisir la langue pour aller plus vite.",
      ],
      best: 0,
      feedback: "La question laisse la personne choisir la langue qui lui convient.",
    },
    {
      speaker: "customer",
      text: "Commençons en français simple. Je n’ai pas bien compris les trois étapes indiquées.",
      choices: [
        "D’accord. Regardons d’abord la première étape, puis vous me direz comment vous la comprenez.",
        "Je vais relire les trois étapes plus lentement, sans changer les mots.",
        "Ce document est pourtant très clair pour la plupart des personnes.",
      ],
      best: 0,
      feedback: "Une seule étape réduit la charge et rend la compréhension observable.",
    },
    {
      speaker: "customer",
      text: "J’ai compris la première étape. Je dois aussi l’expliquer à ma mère à la maison.",
      choices: [
        "Je peux vous remettre un résumé très court. Pour toute question de santé précise, adressez-vous à un pharmacien.",
        "Mémorisez simplement tout ce que je viens de dire.",
        "Je ne peux rien faire si elle n’est pas présente.",
      ],
      best: 0,
      feedback: "Le résumé soutient la transmission et la limite professionnelle reste claire.",
    },
  ],
  learningModules: [
    {
      id: "preference",
      title: "Préférence linguistique",
      label: "Accueil",
      description: "Demande une préférence sans déduire la maîtrise ou le niveau de lecture.",
      question: "Quelle question laisse réellement le choix ?",
      answers: ["Préférez-vous le français simple ou une explication orale en darija ?", "Vous parlez sûrement darija, n’est-ce pas ?", "Vous savez lire le français ?"],
      correct: 0,
    },
    {
      id: "structure",
      title: "Structurer l’explication",
      label: "Clarté",
      description: "Découpe l’information et donne un repère visible pour chaque étape.",
      question: "Quelle séquence aide le mieux à suivre ?",
      answers: ["Une étape · reformulation · étape suivante", "Tout le contenu · question à la fin", "Jargon · répétition · conclusion"],
      correct: 0,
    },
    {
      id: "verification",
      title: "Vérifier sans juger",
      label: "Compréhension",
      description: "Utilise la reformulation pour vérifier l’explication, pas pour tester la personne.",
      question: "Quelle formulation respecte la personne ?",
      answers: ["Pour vérifier si j’ai été clair, comment résumeriez-vous la première étape ?", "Répétez exactement ce que je viens de dire.", "Vous avez compris, oui ou non ?"],
      correct: 0,
    },
  ],
};

const scoreData = [
  { week: 'S1', score: 58, objectif: 70 },
  { week: 'S2', score: 64, objectif: 70 },
  { week: 'S3', score: 61, objectif: 72 },
  { week: 'S4', score: 73, objectif: 72 },
  { week: 'S5', score: 79, objectif: 74 },
  { week: 'S6', score: 76, objectif: 74 },
  { week: 'S7', score: 84, objectif: 76 },
  { week: 'S8', score: 89, objectif: 78 },
];

const competenceData = [
  { skill: 'Clarté', value: 0 },
  { skill: 'Empathie', value: 0 },
  { skill: 'Précision', value: 0 },
];

const radarData = [
  { subject: 'Clarté', A: 0, fullMark: 100 },
  { subject: 'Empathie', A: 0, fullMark: 100 },
  { subject: 'Précision', A: 0, fullMark: 100 },
];

// ─── Cat Bot ──────────────────────────────────────────────────────────────────
const FAQ: Array<{ q: string[]; a: string }> = [
  {
    q: ['vue d\'ensemble', 'dashboard', 'aperçu', 'overview'],
    a: 'La Vue d\'ensemble montre ton score de progression, tes compétences clés et tes statistiques hebdomadaires.C\'est ton tableau de bord principal! 📊',
  },
  {
    q: ['préparation', 'preparation', 'préparer'],
    a: 'Dans Préparation tu retrouves les fiches théoriques, les ressources pharmacologiques et les conseils avant simulation. Lis bien avant de plonger! 📚',
  },
  {
    q: ['simulation', 'simuler', 'exercice', 'pratiquer'],
    a: 'Les Simulations te mettent face à des cas patients réels. Choisit un scénario, réponds au patient et reçois ton score détaillé. Miaou — bonne chance! 🎭',
  },
  {
    q: ['parcours', 'progression', 'chemin', 'étape'],
    a: 'Le Parcours affiche ton chemin complet de formation — des fondamentaux à la certification finale. Les étapes se débloquent au fur et à mesure! 🏆',
  },
  {
    q: ['score', 'note', 'résultat', 'performance'],
    a: 'Ton score actuel est 89/100 — super! 🐾 Continue les simulations pour maintenir la courbe à la hausse.',
  },
  {
    q: ['compétence', 'competence', 'empathie', 'écoute'],
    a: 'Tes compétences sont évaluées à chaque simulation. Empathie est ton point fort (90/100)! Travaille la Synthèse (63) et la Reformulation (68). 💪',
  },
  {
    q: ['aide', 'help', 'quoi', 'comment', 'bonjour', 'salut', 'hello'],
    a: 'Miaou! 🐱 Pose-moi une question sur: le tableau de bord, la préparation, les simulations, le parcours, tes scores ou tes compétences!',
  },
];

function catAnswer(input: string): string {
  const q = input.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const entry of FAQ) {
    if (entry.q.some(kw => q.includes(kw.normalize('NFD').replace(/[̀-ͯ]/g, '')))) {
      return entry.a;
    }
  }
  return 'Hmm, je ne suis pas sûr de comprendre, mais je suis là pour aider! 🐾 Essaie: "simulation", "score", "parcours" ou "compétences".';
}

interface Msg { from: 'cat' | 'user'; text: string }

function CatBot() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: 'cat', text: 'Miaou! 🐱 Je suis Dr. Moustache, votre guide pharmacien. Posez-moi une question sur la plateforme!' },
  ]);
  const [input, setInput] = useState('');
  const [pulse, setPulse] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, open]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!open) { setPulse(true); setTimeout(() => setPulse(false), 800); }
    }, 6000);
    return () => clearInterval(id);
  }, [open]);

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const u: Msg = { from: 'user', text: input };
    setMsgs(p => [...p, u]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: u.text })
      });
      const data = await response.json();
      setMsgs(p => [...p, { from: 'cat', text: data.reply }]);
    } catch (error) {
      setMsgs(p => [...p, { from: 'cat', text: "Miaou... Je n'arrive pas à me connecter au serveur." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
      {open && (
        <div style={{
          width: 320, borderRadius: 20, overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(25,40,32,0.18)',
          border: `1.5px solid ${T.sageMid}`,
          background: T.white,
          display: 'flex', flexDirection: 'column',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {/* Header */}
          <div style={{
            background: `linear-gradient(135deg, ${T.sageDark} 0%, ${T.sage} 100%)`,
            padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            {/* Cat avatar */}
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, flexShrink: 0,
            }}>🐱</div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "'Fraunces', serif", fontWeight: 600,
                fontSize: 15, color: '#fff', letterSpacing: '-0.01em',
              }}>Dr. Moustache</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', fontFamily: "'DM Mono', monospace" }}>
                Pharmacien · Guide IA
              </div>
            </div>
            <button onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 20, cursor: 'pointer', lineHeight: 1, padding: 0 }}>
              ×
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 220, maxHeight: 300 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 6 }}>
                {m.from === 'cat' && <span style={{ fontSize: 16, marginBottom: 2 }}>🐾</span>}
                <div style={{
                  maxWidth: '80%', padding: '9px 13px', borderRadius: m.from === 'cat' ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                  fontSize: 13, lineHeight: 1.5,
                  background: m.from === 'cat' ? T.sageMist : T.sageDark,
                  color: m.from === 'cat' ? T.ink : '#fff',
                  border: m.from === 'cat' ? `1px solid ${T.border}` : 'none',
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          {/* Quick prompts */}
          <div style={{ padding: '8px 14px 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Mes scores', 'Simulations', 'Parcours'].map(label => (
              <button key={label} onClick={() => { setInput(label); }}
                style={{
                  background: T.sagePale, border: `1px solid ${T.border}`,
                  borderRadius: 99, padding: '4px 10px', fontSize: 11,
                  color: T.sageDark, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}>
                {label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{ padding: 12, display: 'flex', gap: 8 }}>
            <input
              style={{
                flex: 1, borderRadius: 10, border: `1.5px solid ${T.border}`,
                padding: '9px 12px', fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                background: T.sageMist, color: T.ink, outline: 'none',
              }}
              placeholder="Posez une question…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
            />
            <button onClick={send}
              style={{
                background: T.sageDark, color: '#fff', border: 'none',
                borderRadius: 10, padding: '9px 14px', fontSize: 16, cursor: 'pointer',
                transition: 'opacity 0.15s',
              }}
              onMouseOver={e => (e.currentTarget.style.opacity = '0.85')}
              onMouseOut={e => (e.currentTarget.style.opacity = '1')}
            >↑</button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button onClick={() => setOpen(o => !o)} style={{
        width: 60, height: 60, borderRadius: '50%',
        background: `linear-gradient(135deg, ${T.sageDark}, ${T.sage})`,
        border: `3px solid ${T.white}`,
        boxShadow: pulse
          ? `0 0 0 6px rgba(110,158,130,0.35), 0 8px 24px rgba(25,40,32,0.22)`
          : `0 8px 24px rgba(25,40,32,0.18)`,
        cursor: 'pointer', fontSize: 26, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        transition: 'box-shadow 0.4s, transform 0.15s',
        transform: open ? 'scale(0.95)' : 'scale(1)',
      }}>
        🐱
      </button>
    </div>
  );
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: T.ink, borderRadius: 10, padding: '10px 14px',
      fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: T.sagePale,
      boxShadow: '0 8px 30px rgba(0,0,0,0.25)', minWidth: 130,
    }}>
      <div style={{ fontFamily: "'Fraunces', serif", color: T.sageMid, marginBottom: 6, fontSize: 13 }}>{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.color, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ color: T.dust }}>{p.name}</span>
          <span style={{ fontFamily: "'DM Mono', monospace", color: '#fff', marginLeft: 'auto', paddingLeft: 10 }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function Stat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div style={{
      background: T.white, borderRadius: 16, padding: '22px 24px',
      border: `1px solid ${T.border}`,
    }}>
      <div style={{ width: 36, height: 3, borderRadius: 2, background: accent, marginBottom: 18 }} />
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: 36, fontWeight: 700, color: T.ink, lineHeight: 1 }}>{value}</div>
      <div style={{ fontWeight: 600, color: T.sageDark, fontSize: 13, marginTop: 8 }}>{label}</div>
      <div style={{ color: T.dust, fontSize: 11, marginTop: 3, fontFamily: "'DM Mono', monospace" }}>{sub}</div>
    </div>
  );
}

// ─── Progress Ring ─────────────────────────────────────────────────────────────
function Ring({ value, label }: { value: number; label: string }) {
  const r = 26; const c = 2 * Math.PI * r;
  const fill = (value / 100) * c;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <svg width={64} height={64} viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke={T.border} strokeWidth={5} />
        <circle cx="32" cy="32" r={r} fill="none"
          stroke={value >= 80 ? T.sage : value >= 65 ? T.teal : T.dust}
          strokeWidth={5} strokeLinecap="round"
          strokeDasharray={`${fill} ${c - fill}`}
          strokeDashoffset={c / 4} style={{ transition: 'stroke-dasharray 0.6s' }}
        />
        <text x="32" y="36" textAnchor="middle" style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fill: T.ink, fontWeight: 500 }}>
          {value}
        </text>
      </svg>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: T.ink }}>{label}</div>
        <div style={{ fontSize: 11, color: T.dust, fontFamily: "'DM Mono', monospace" }}>/100</div>
      </div>
    </div>
  );
}

// ─── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview', label: 'Vue d\' ensemble' },
  { id: 'preparation', label: 'Préparation' },
  { id: 'simulation', label: 'Simulation' },
  { id: 'verifications', label: 'Vérifications' },
  { id: 'parcours', label: 'Parcours' },
];

// ─── Views ─────────────────────────────────────────────────────────────────────
function Overview({ dialogueAnswers }: any) {
  let avgScore = 0;
  let sims = 0;
  let emp = 0, cla = 0, acc = 0;
  if (dialogueAnswers && dialogueAnswers.length > 0) {
     const scores = dialogueAnswers.map((a: any) => {
        const s = a.evaluation?.scores;
        if (s) {
          emp += s.empathy || 0;
          cla += s.clarity || 0;
          acc += s.accuracy || 0;
        }
        return s ? (s.empathy + s.clarity + s.accuracy) / 3 : 0;
     });
     avgScore = Math.round(scores.reduce((a:number,b:number)=>a+b, 0) / scores.length);
     sims = dialogueAnswers.length;
     emp = Math.round(emp / sims);
     cla = Math.round(cla / sims);
     acc = Math.round(acc / sims);
  }

  const dynamicCompetenceData = [
    { skill: 'Clarté', value: cla },
    { skill: 'Empathie', value: emp },
    { skill: 'Précision', value: acc },
  ];

  const dynamicRadarData = [
    { subject: 'Clarté', A: cla, fullMark: 100 },
    { subject: 'Empathie', A: emp, fullMark: 100 },
    { subject: 'Précision', A: acc, fullMark: 100 },
  ];

  const dynamicScoreData = Array.from({ length: 8 }).map((_, i) => {
    let score = 0;
    // Update score history based on simulations completed, otherwise 0
    if (i < sims) {
      const s = dialogueAnswers[i].evaluation?.scores;
      score = s ? Math.round((s.empathy + s.clarity + s.accuracy) / 3) : 0;
    } else if (sims > 0) {
      // flatline at current average for remaining if any
      score = 0;
    }
    return {
      week: `Sim ${i + 1}`,
      score: score,
      objectif: 70 + i
    }
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 18 }}>
        <Stat label="Score global" value={avgScore.toString()} sub="Basé sur l'IA" accent={T.sage} />
        <Stat label="Simulations" value={sims.toString()} sub="Cas traités" accent={T.teal} />
        <Stat label="Temps d'étude" value="0h" sub="Cette semaine 0h" accent={T.lav} />
        <Stat label="Complétion" value="0%" sub="Phase 1 en cours" accent={T.dust} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 22 }}>
        {/* Area – progression score */}
        <div style={{ background: T.white, borderRadius: 18, padding: '26px 26px 18px', border: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
            <div>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 600, color: T.ink, margin: 0 }}>
                Progression du score
              </h2>
              <p style={{ color: T.dust, fontSize: 11, margin: '4px 0 0', fontFamily: "'DM Mono', monospace" }}>
                Semaines 1–8 · Score vs Objectif
              </p>
            </div>
            <span style={{
              background: T.sagePale, color: T.sageDark, borderRadius: 8,
              padding: '4px 12px', fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 500,
            }}>↑ +31 pts</span>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={dynamicScoreData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.sage} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={T.sage} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gObj" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.lav} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={T.lav} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={T.border} strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="week" tick={{ fill: T.dust, fontSize: 11, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: T.dust, fontSize: 11, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="objectif" name="objectif" stroke={T.lav} strokeWidth={1.5} strokeDasharray="5 3" fill="url(#gObj)" dot={false} activeDot={{ r: 3, fill: T.lav, strokeWidth: 0 }} />
              <Area type="monotone" dataKey="score" name="score" stroke={T.sage} strokeWidth={2.5} fill="url(#gScore)" dot={{ r: 3, fill: T.white, stroke: T.sage, strokeWidth: 2 }} activeDot={{ r: 5, fill: T.sage, strokeWidth: 0 }} />
              <Legend iconType="circle" iconSize={7}
                formatter={(v) => <span style={{ color: T.inkSoft, fontSize: 11, fontFamily: "'DM Mono', monospace" }}>{v}</span>}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Radar – compétences */}
        <div style={{ background: T.white, borderRadius: 18, padding: '26px 20px 18px', border: `1px solid ${T.border}` }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 600, color: T.ink, margin: '0 0 4px' }}>
            Compétences
          </h2>
          <p style={{ color: T.dust, fontSize: 11, margin: '0 0 14px', fontFamily: "'DM Mono', monospace" }}>Profil de communication</p>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={dynamicRadarData} margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
              <PolarGrid stroke={T.sagePale} />
              <PolarAngleAxis dataKey="subject" tick={{ fill: T.sageDark, fontSize: 10, fontFamily: "'DM Mono', monospace" }} />
              <Radar name="Score" dataKey="A" stroke={T.sage} strokeWidth={1.5} fill={T.sageMist} fillOpacity={0.8} />
              <Tooltip content={<ChartTip />} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar chart – compétences détail */}
      <div style={{ background: T.white, borderRadius: 18, padding: '26px 26px 18px', border: `1px solid ${T.border}` }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 600, color: T.ink, margin: '0 0 4px' }}>
          Détail des compétences
        </h2>
        <p style={{ color: T.dust, fontSize: 11, margin: '0 0 18px', fontFamily: "'DM Mono', monospace" }}>Score par axe · Dernière évaluation</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={dynamicCompetenceData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barSize={22}>
            <CartesianGrid stroke={T.border} strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="skill" tick={{ fill: T.dust, fontSize: 11, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: T.dust, fontSize: 11, fontFamily: "'DM Mono', monospace" }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTip />} />
            <Bar dataKey="value" name="score" radius={[6, 6, 0, 0]}
              fill={T.sage}
              label={{ position: 'top', fill: T.inkSoft, fontSize: 10, fontFamily: "'DM Mono', monospace" }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Preparation({ prep, setPrep, setTab }: any) {
  const togglePrep = (id: string) => {
    setPrep((prev: string[]) => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };
  const allChecked = prep.length === DATA.preparation.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 740 }}>
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 600, color: T.ink, margin: '0 0 6px' }}>
          Ressources de préparation
        </h2>
        <p style={{ color: T.inkSoft, fontSize: 14, margin: 0 }}>
          Lisez les points et indiquez que vous êtes prêt à les appliquer.
        </p>
      </div>
      {DATA.preparation.map((m, i) => {
        const done = prep.includes(m.id);
        return (
          <div key={m.id} style={{
            background: T.white, borderRadius: 14, padding: '18px 22px',
            border: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', gap: 16,
            opacity: done ? 0.72 : 1,
            cursor: 'pointer', transition: 'box-shadow 0.15s',
          }}
            onClick={() => togglePrep(m.id)}
            onMouseOver={e => { if (!done) (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px rgba(110,158,130,0.13)`; }}
            onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: done ? T.sagePale : T.sageMist,
              border: `1.5px solid ${done ? T.sageMid : T.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, flexShrink: 0,
            }}>
              {done ? '✓' : '○'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: T.ink }}>{m.title}</div>
              <div style={{ fontSize: 13, color: T.inkSoft, marginTop: 4 }}>{m.body}</div>
            </div>
            <span style={{
              background: done ? T.sagePale : T.lavPale, color: done ? T.sageDark : T.lav,
              borderRadius: 8, padding: '3px 10px', fontSize: 11,
              fontFamily: "'DM Mono', monospace", fontWeight: 500, flexShrink: 0,
            }}>{done ? "Prêt" : "À faire"}</span>
          </div>
        );
      })}
      
      {allChecked && (
        <button onClick={() => setTab('simulation')} style={{
          marginTop: 10, background: T.sageDark, color: '#fff', border: 'none', borderRadius: 10, padding: '14px 20px',
          fontSize: 15, cursor: 'pointer', fontWeight: 600, alignSelf: 'flex-start',
          transition: 'opacity 0.2s'
        }}
          onMouseOver={e => (e.currentTarget.style.opacity = '0.9')}
          onMouseOut={e => (e.currentTarget.style.opacity = '1')}
        >
          Aller à la simulation →
        </button>
      )}
    </div>
  );
}

function Simulation({ scenarios, dialogueAnswers, setDialogueAnswers, dialogueStep, setDialogueStep, setTab }: any) {
  if (!scenarios || scenarios.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <p style={{ color: '#88928A', fontSize: 15 }}>Chargement des scénarios...</p>
      </div>
    );
  }

  const completed = dialogueAnswers.length;
  const done = completed >= scenarios.length;
  const current = scenarios[Math.min(dialogueStep, Math.max(0, scenarios.length - 1))] || {};

  const [inputText, setInputText] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [mode, setMode] = useState<"qcm" | "free">("qcm");

  const handleQcmChoice = (choice: any) => {
    const evaluation = {
      feedback: choice.reaction + (choice.is_optimal ? "\nBravo, c'est la meilleure réponse!" : "\nAttention, cette réponse n'est pas optimale."),
      scores: {
        empathy: choice.is_optimal ? 100 : 40,
        clarity: choice.is_optimal ? 100 : 50,
        accuracy: choice.is_optimal ? 100 : 60
      }
    };
    setDialogueAnswers((prev: any[]) => {
      const next = [...prev];
      next[dialogueStep] = { text: choice.option, evaluation: evaluation };
      return next;
    });
    setDialogueStep((prev: number) => Math.min(prev + 1, scenarios.length));
    setInputText("");
  };

  const handleSubmit = async () => {
    if (!inputText.trim()) return;
    setIsEvaluating(true);
    try {
      const res = await fetch('http://localhost:8001/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: current.id, user_text: inputText })
      });
      const data = await res.json();
      
      setDialogueAnswers((prev: any[]) => {
        const next = [...prev];
        next[dialogueStep] = { text: inputText, evaluation: data };
        return next;
      });
      setDialogueStep((prev: number) => Math.min(prev + 1, scenarios.length));
      setInputText("");
    } catch (e) {
      console.error(e);
    }
    setIsEvaluating(false);
  };

  const resetDialogue = () => {
    setDialogueAnswers([]);
    setDialogueStep(0);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 740 }}>
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 600, color: T.ink, margin: '0 0 6px' }}>
          Simulation interactive
        </h2>
        <p style={{ color: T.inkSoft, fontSize: 14, margin: 0 }}>
          Mettez-vous dans la peau d'un pharmacien face à un patient réel.
        </p>
      </div>

      <div style={{
        background: T.white, borderRadius: 14, padding: '18px 22px',
        border: `1px solid ${T.sage}`,
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>Scénario: {current.category || "Général"}</div>
            <div style={{ fontSize: 13, color: T.inkSoft, marginTop: 2 }}><strong>Objectif:</strong> {current.learners_task || "..."}</div>
          </div>
        </div>

        <div style={{ background: T.surface, padding: 16, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {scenarios.map((scenario: any, index: number) => {
            if (index > dialogueStep && !done) return null;
            const answer = dialogueAnswers[index];
            return (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: 12, borderBottom: index < dialogueStep ? `1px solid ${T.border}` : 'none', paddingBottom: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 11, color: T.dust, marginBottom: 4 }}>Client</span>
                  <div style={{ background: T.white, padding: '10px 14px', borderRadius: '0 14px 14px 14px', fontSize: 14, color: T.ink, border: `1px solid ${T.border}` }}>
                    {scenario.customer_opening}
                  </div>
                </div>
                {answer && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: 11, color: T.dust, marginBottom: 4 }}>Vous</span>
                      <div style={{ background: T.sagePale, padding: '10px 14px', borderRadius: '14px 0 14px 14px', fontSize: 14, color: T.sageDark, border: `1px solid ${T.border}` }}>
                        {answer.text}
                      </div>
                    </div>
                    <div style={{ marginTop: 12, padding: 12, background: T.lavPale, borderRadius: 10, fontSize: 13, color: T.inkMid }}>
                      <strong>Feedback IA :</strong> {answer.evaluation?.feedback || "Aucun feedback"}
                      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                        <span style={{background: '#fff', padding: '4px 8px', borderRadius: 6}}>Empathie: {answer.evaluation?.scores?.empathy}%</span>
                        <span style={{background: '#fff', padding: '4px 8px', borderRadius: 6}}>Clarté: {answer.evaluation?.scores?.clarity}%</span>
                        <span style={{background: '#fff', padding: '4px 8px', borderRadius: 6}}>Précision: {answer.evaluation?.scores?.accuracy}%</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {!done && current ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <button onClick={() => setMode('qcm')} style={{
                background: mode === 'qcm' ? T.sageDark : T.surface, color: mode === 'qcm' ? '#fff' : T.inkSoft,
                border: `1px solid ${mode === 'qcm' ? T.sageDark : T.border}`, borderRadius: 20, padding: '6px 14px',
                fontSize: 13, cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s'
              }}>Choix multiple</button>
              <button onClick={() => setMode('free')} style={{
                background: mode === 'free' ? T.sageDark : T.surface, color: mode === 'free' ? '#fff' : T.inkSoft,
                border: `1px solid ${mode === 'free' ? T.sageDark : T.border}`, borderRadius: 20, padding: '6px 14px',
                fontSize: 13, cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s'
              }}>Texte libre</button>
            </div>

            {mode === 'free' ? (
              <>
                <p style={{ fontSize: 13, fontWeight: 600, color: T.ink, margin: 0 }}>Que répondez-vous (texte libre) ?</p>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Tapez votre réponse ici..."
                  style={{
                    background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 16px',
                    fontSize: 14, color: T.ink, minHeight: 80, fontFamily: 'inherit', outline: 'none'
                  }}
                />
                <button onClick={handleSubmit} disabled={isEvaluating} style={{
                  background: T.sageDark, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px',
                  fontSize: 14, cursor: isEvaluating ? 'not-allowed' : 'pointer', fontWeight: 500, alignSelf: 'flex-start'
                }}>
                  {isEvaluating ? 'Évaluation en cours...' : 'Envoyer la réponse'}
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, fontWeight: 600, color: T.ink, margin: 0 }}>Choisissez votre réponse :</p>
                {current.guided_choices && Array.isArray(current.guided_choices) ? current.guided_choices.map((choice: any, idx: number) => (
                  <button key={idx} onClick={() => handleQcmChoice(choice)} style={{
                    background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 16px',
                    textAlign: 'left', fontSize: 14, color: T.ink, cursor: 'pointer', transition: 'border 0.2s',
                  }}
                    onMouseOver={e => (e.currentTarget.style.borderColor = T.sage)}
                    onMouseOut={e => (e.currentTarget.style.borderColor = T.border)}
                  >
                    {choice.option}
                  </button>
                )) : <p style={{ fontSize: 13, color: T.inkSoft }}>Aucun choix disponible pour ce scénario.</p>}
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <button onClick={() => setTab('verifications')} style={{
              background: T.sageDark, color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px',
              fontSize: 14, cursor: 'pointer', fontWeight: 500,
            }}>
              Voir les vérifications
            </button>
            <button onClick={resetDialogue} style={{
              background: T.surface, color: T.inkSoft, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 16px',
              fontSize: 14, cursor: 'pointer', fontWeight: 500,
            }}>
              Recommencer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function AnimatedScore({ label, targetScore, color }: { label: string, targetScore: number, color: string }) {
  const [score, setScore] = useState(0);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += Math.ceil((targetScore - current) / 10) || 1;
      if (current >= targetScore) {
        setScore(targetScore);
        clearInterval(interval);
      } else {
        setScore(current);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [targetScore]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: '#fff', padding: 20, borderRadius: 16, border: `1px solid ${T.border}`, flex: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
       <div style={{ fontSize: 32, fontWeight: 700, color: color }}>{score}%</div>
       <div style={{ fontSize: 14, fontWeight: 600, color: T.inkSoft }}>{label}</div>
    </div>
  )
}

function Verifications({ scenarios, dialogueAnswers, quizAnswers, setQuizAnswers }: any) {
  const [showResults, setShowResults] = useState(false);

  const avgScores = useMemo(() => {
    let emp = 0, cla = 0, acc = 0, count = 0;
    dialogueAnswers.forEach((ans: any) => {
      if (ans?.evaluation?.scores) {
        emp += ans.evaluation.scores.empathy || 0;
        cla += ans.evaluation.scores.clarity || 0;
        acc += ans.evaluation.scores.accuracy || 0;
        count++;
      }
    });
    if (count === 0) return { empathy: 0, clarity: 0, accuracy: 0 };
    return {
      empathy: Math.round(emp / count),
      clarity: Math.round(cla / count),
      accuracy: Math.round(acc / count)
    };
  }, [dialogueAnswers]);

  const handleShowResults = () => {
    setShowResults(true);
    // Mark quiz as done by populating quizAnswers with dummy values so Parcours knows it's done
    const results: any = {};
    (scenarios || []).forEach((s: any) => { results[s.id] = 1; });
    setQuizAnswers(results);
  };

  const handleAnswer = (moduleId: string, answerIndex: number) => {
    setQuizAnswers((prev: any) => ({ ...prev, [moduleId]: answerIndex }));
  };

  const learningModules = (scenarios || []).map((s: any, index: number) => {
    let correctIdx = 0;
    if (s.guided_choices) {
       const optimalIdx = s.guided_choices.findIndex((c: any) => c.is_optimal);
       if (optimalIdx !== -1) correctIdx = optimalIdx;
    }
    const userAnswerText = dialogueAnswers[index] ? dialogueAnswers[index].text : null;
    let selectedIdx = -1;
    if (userAnswerText && s.guided_choices) {
        selectedIdx = s.guided_choices.findIndex((c: any) => c.option === userAnswerText);
    }
    
    return {
      id: s.id,
      title: s.learners_task || "Vérification",
      label: s.category || "Général",
      description: s.coaching_hint || "Revue des bonnes pratiques.",
      question: "Quelle est l'approche recommandée ?",
      answers: s.guided_choices ? s.guided_choices.map((c:any) => c.option) : ["Oui", "Non"],
      correct: correctIdx,
      userText: selectedIdx === -1 && userAnswerText ? userAnswerText : null,
      selectedIdx: selectedIdx !== -1 ? selectedIdx : undefined
    };
  });

  if (!scenarios || scenarios.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
        <p style={{ color: '#88928A', fontSize: 15 }}>Chargement des vérifications...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 740, paddingBottom: 40 }}>
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 600, color: T.ink, margin: '0 0 6px' }}>
          Vérifications des acquis
        </h2>
        <p style={{ color: T.inkSoft, fontSize: 14, margin: 0 }}>
          Revue de vos décisions lors de la simulation. Cliquez sur le bouton en bas pour voir les résultats.
        </p>
      </div>

      {showResults && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
          <AnimatedScore label="Empathie" targetScore={avgScores.empathy} color="#4A6572" />
          <AnimatedScore label="Clarté" targetScore={avgScores.clarity} color="#4A6572" />
          <AnimatedScore label="Précision" targetScore={avgScores.accuracy} color="#4A6572" />
        </div>
      )}

      {learningModules.map((module: any) => {
        const selected = module.selectedIdx !== undefined ? module.selectedIdx : quizAnswers[module.id];
        
        return (
          <div key={module.id} style={{
            background: T.white, borderRadius: 14, padding: '18px 22px', border: `1px solid ${T.border}`,
            display: 'flex', flexDirection: 'column', gap: 12
          }}>
            <div>
              <span style={{
                background: T.sagePale, color: T.sageDark,
                borderRadius: 8, padding: '3px 10px', fontSize: 11,
                fontFamily: "'DM Mono', monospace", fontWeight: 500,
              }}>{module.label}</span>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.ink, marginTop: 8 }}>{module.title}</div>
              <div style={{ fontSize: 13, color: T.inkSoft, marginTop: 4 }}>{module.description}</div>
            </div>

            <div style={{ marginTop: 8 }}>
              <strong style={{ fontSize: 14, color: T.ink }}>{module.question}</strong>
              
              {module.userText && (
                 <div style={{ background: T.sagePale, padding: '10px 14px', borderRadius: 10, fontSize: 14, color: T.sageDark, marginTop: 10, border: `1px solid ${T.sageMid}` }}>
                    <strong>Votre réponse libre :</strong> {module.userText}
                 </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                {module.answers.map((ans: string, idx: number) => {
                  const isSelected = selected === idx;
                  const isCorrect = idx === module.correct;
                  let bg = T.surface; let color = T.ink; let border = T.border;

                  if (showResults) {
                    if (isCorrect) {
                      bg = T.sagePale; color = T.sageDark; border = T.sage;
                    } else if (isSelected) {
                      bg = '#FDEEEA'; color = '#B33A3A'; border = '#E3A3A3';
                    }
                  } else {
                    if (isSelected) {
                      bg = T.lavPale; color = T.ink; border = T.lav;
                    }
                  }

                  return (
                    <button key={idx} onClick={() => handleAnswer(module.id, idx)} disabled={selected !== undefined}
                      style={{
                        background: bg, color, border: `1px solid ${border}`, borderRadius: 10, padding: '10px 14px',
                        textAlign: 'left', fontSize: 14, cursor: selected !== undefined ? 'default' : 'pointer', transition: 'border 0.2s',
                      }}
                    >
                      {ans}
                    </button>
                  );
                })}
              </div>
              {selected !== undefined && (
                <div style={{ fontSize: 13, color: selected === module.correct ? T.sageDark : '#B33A3A', marginTop: 12, fontWeight: 500 }}>
                  {selected === module.correct ? "Bonne réponse. " : "Pas tout à fait. "}La réponse recommandée est mise en évidence.
                </div>
              )}
            </div>
          </div>
        )
      })}
      
      {!showResults && (
        <button onClick={handleShowResults} style={{
          background: T.sageDark, color: '#fff', border: 'none', borderRadius: 10, padding: '14px 24px',
          fontSize: 16, cursor: 'pointer', fontWeight: 600, alignSelf: 'center', marginTop: 10
        }}>
          Voir les résultats finaux
        </button>
      )}
    </div>
  );
}

function Parcours({ scenarios, prep, dialogueAnswers, quizAnswers, setTab, resetAll }: any) {
  const totalScenarios = Math.max(scenarios.length, 1);
  const prepDone = prep.length === DATA.preparation.length;
  const simDone = dialogueAnswers.length === totalScenarios && scenarios.length > 0;
  const quizCount = Object.keys(quizAnswers).length;
  const quizDone = quizCount === totalScenarios && scenarios.length > 0;

  const progressValue = Math.round(((prep.length / DATA.preparation.length + dialogueAnswers.length / totalScenarios + quizCount / totalScenarios) / 3) * 100);

  const steps = [
    { phase: 'Préparation', description: `${prep.length}/${DATA.preparation.length} points préparés.`, status: prepDone ? 'done' : 'active', target: 'preparation' },
    { phase: 'Simulation de dialogue', description: `${dialogueAnswers.length}/${totalScenarios} décisions prises.`, status: simDone ? 'done' : prepDone ? 'active' : 'locked', target: 'simulation' },
    { phase: 'Vérifications', description: `${quizCount}/${totalScenarios} modules terminés.`, status: quizDone ? 'done' : simDone ? 'active' : 'locked', target: 'verifications' },
  ];

  const statusStyle: Record<string, { bg: string; border: string; dot: string; label: string }> = {
    done: { bg: T.sagePale, border: T.sageMid, dot: T.sage, label: 'Complété' },
    active: { bg: '#EAF1F7', border: '#8AB8C4', dot: T.teal, label: 'En cours' },
    locked: { bg: T.surface, border: T.border, dot: T.dust, label: 'Verrouillé' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 740 }}>
      <div style={{ marginBottom: 8 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: 26, fontWeight: 600, color: T.ink, margin: '0 0 6px' }}>
          Ton parcours d’apprentissage
        </h2>
        <p style={{ color: T.inkSoft, fontSize: 14, margin: 0 }}>
          La progression réunit préparation, dialogue et vérifications.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24 }}>
        {/* Timeline */}
        <div style={{ position: 'relative' }}>
          {/* connector line */}
          <div style={{ position: 'absolute', left: 19, top: 40, bottom: 40, width: 2, background: T.border, zIndex: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {steps.map((p, i) => {
              const s = statusStyle[p.status];
              return (
                <div key={i} style={{
                  background: T.white, borderRadius: 14, padding: '18px 20px',
                  border: `1.5px solid ${s.border}`,
                  display: 'flex', alignItems: 'center', gap: 18, position: 'relative', zIndex: 1,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: s.bg, border: `2px solid ${s.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: s.dot }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: T.ink }}>{p.phase}</div>
                    <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 3 }}>
                      {p.description}
                    </div>
                  </div>
                  <button onClick={() => setTab(p.target)} style={{
                    fontSize: 12, fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
                    color: T.white, background: T.ink,
                    border: `none`, cursor: 'pointer',
                    borderRadius: 8, padding: '6px 12px',
                  }}>Ouvrir</button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Progress Widget */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ background: T.white, borderRadius: 16, padding: 24, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: T.dust, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: "'DM Mono', monospace" }}>Progression globale</div>
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: 42, fontWeight: 700, color: T.sageDark, margin: '12px 0 16px' }}>{progressValue}%</div>

            <div style={{ width: '100%', height: 8, background: T.surface, borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${progressValue}%`, height: '100%', background: T.sage, transition: 'width 0.4s' }} />
            </div>

            <p style={{ fontSize: 12, color: T.inkSoft, marginTop: 16 }}>
              Cette valeur est calculée de façon transparente à partir de trois activités de même poids.
            </p>

            <button onClick={resetAll} style={{
              marginTop: 16, background: 'transparent', border: `1px solid ${T.border}`, color: T.inkSoft,
              borderRadius: 8, padding: '8px 12px', fontSize: 12, cursor: 'pointer'
            }}>
              Réinitialiser la progression
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('parcours');

  const [prep, setPrep] = useState<string[]>([]);
  const [dialogueAnswers, setDialogueAnswers] = useState<any[]>([]);
  const [dialogueStep, setDialogueStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [scenarios, setScenarios] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://localhost:8001/api/scenarios')
      .then(res => res.json())
      .then(data => {
        if (data.scenarios) {
          const shuffled = [...data.scenarios].sort(() => 0.5 - Math.random());
          setScenarios(shuffled.slice(0, 5));
        }
      })
      .catch(err => console.error("Error fetching scenarios:", err));
  }, []);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('bp-learning-state');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.prep) setPrep(parsed.prep);
        if (parsed.dialogueAnswers) {
          setDialogueAnswers(parsed.dialogueAnswers);
          setDialogueStep(parsed.dialogueAnswers.length);
        }
        if (parsed.quizAnswers) setQuizAnswers(parsed.quizAnswers);
      }
    } catch (e) {
      console.error('Failed to load state', e);
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('bp-learning-state', JSON.stringify({ prep, dialogueAnswers, quizAnswers }));
  }, [prep, dialogueAnswers, quizAnswers]);

  const resetAll = () => {
    setPrep([]); setDialogueAnswers([]); setDialogueStep(0); setQuizAnswers({});
  };

  const views = {
    overview: <Overview dialogueAnswers={dialogueAnswers} />,
    preparation: <Preparation prep={prep} setPrep={setPrep} setTab={setTab} />,
    simulation: <Simulation scenarios={scenarios} dialogueAnswers={dialogueAnswers} setDialogueAnswers={setDialogueAnswers} dialogueStep={dialogueStep} setDialogueStep={setDialogueStep} setTab={setTab} />,
    verifications: <Verifications scenarios={scenarios} dialogueAnswers={dialogueAnswers} quizAnswers={quizAnswers} setQuizAnswers={setQuizAnswers} />,
    parcours: <Parcours scenarios={scenarios} prep={prep} dialogueAnswers={dialogueAnswers} quizAnswers={quizAnswers} setTab={setTab} resetAll={resetAll} />,
  };
  const view = views[tab as keyof typeof views];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface)', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Nav */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: T.white, borderBottom: `1px solid ${T.border}`,
        backdropFilter: 'blur(8px)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 36px', display: 'flex', alignItems: 'center', height: 58 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, marginRight: 40, flexShrink: 0 }}>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 400, fontSize: 17, color: T.inkMid }}>BP</span>
            <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 17, color: T.sageDark, fontStyle: 'italic' }}>Learning</span>
          </div>

          {/* Tabs */}
          <nav style={{ display: 'flex', gap: 2, flex: 1 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{
                  border: 'none', cursor: 'pointer',
                  padding: '6px 16px', fontSize: 13, fontWeight: 500,
                  fontFamily: "'DM Sans', sans-serif",
                  color: tab === t.id ? T.sageDark : T.inkSoft,
                  borderRadius: 8, position: 'relative',
                  transition: 'color 0.15s, background 0.15s',
                  background: tab === t.id ? T.sagePale : 'transparent' as any,
                }}
                onMouseOver={e => { if (tab !== t.id) (e.currentTarget as HTMLButtonElement).style.background = T.sageMist; }}
                onMouseOut={e => { if (tab !== t.id) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {/* Profile */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: T.sagePale, borderRadius: 10, padding: '6px 12px',
            fontSize: 12, fontWeight: 500, color: T.sageDark, flexShrink: 0,
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: T.sage, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: '#fff', fontWeight: 700,
            }}>N</div>
            {DATA.learner.initials} - {DATA.learner.displayName.split(' · ')[0]}
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '36px 36px 80px' }}>
        {/* Page header */}
        <div style={{ marginBottom: 30 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: T.sage, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            {TABS.find(t => t.id === tab)?.label}
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 32, fontWeight: 700, color: T.ink, margin: 0, lineHeight: 1.1 }}>
            {tab === 'overview' && <>Bonjour,&nbsp;<span style={{ color: T.sage }}>Nadia.</span></>}
            {tab === 'preparation' && 'Vos ressources'}
            {tab === 'simulation' && 'Scénarios patients'}
            {tab === 'verifications' && 'Vérifications des acquis'}
            {tab === 'parcours' && 'Votre formation'}
          </h1>
        </div>
        {view}
      </main>

      <CatBot />
    </div>
  );
}

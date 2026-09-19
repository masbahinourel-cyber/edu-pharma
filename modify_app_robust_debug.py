import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

print("Original length:", len(content))

# 1. Update App state
new_content, count = re.subn(
    r'const \[quizAnswers, setQuizAnswers\] = useState<Record<string, number>>\(\{\}\);',
    r'const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});\n  const [scenarios, setScenarios] = useState<any[]>([]);\n\n  useEffect(() => {\n    fetch(\'http://localhost:8001/api/scenarios\')\n      .then(res => res.json())\n      .then(data => {\n        if (data.scenarios) setScenarios(data.scenarios);\n      })\n      .catch(err => console.error("Error fetching scenarios:", err));\n  }, []);',
    content
)
print("Replaced quizAnswers state:", count)

new_content, count = re.subn(
    r'const \[dialogueAnswers, setDialogueAnswers\] = useState<number\[\]>\(\[\]\);',
    r'const [dialogueAnswers, setDialogueAnswers] = useState<any[]>([]);',
    new_content
)
print("Replaced dialogueAnswers state:", count)

# 2. Update views mapping
new_content, count = re.subn(
    r'overview: <Overview />,\s*preparation:',
    r'overview: <Overview dialogueAnswers={dialogueAnswers} />,\n    preparation:',
    new_content
)
print("Replaced views mapping (overview):", count)

new_content, count = re.subn(
    r'simulation: <Simulation dialogueAnswers',
    r'simulation: <Simulation scenarios={scenarios} dialogueAnswers',
    new_content
)
print("Replaced views mapping (simulation):", count)

# 3. Update Simulation Component Signature and Variables
new_content, count = re.subn(
    r'function Simulation\(\{ dialogueAnswers, setDialogueAnswers, dialogueStep, setDialogueStep, setTab \}: any\) \{[\s\S]*?const handleChoice = \(index: number\) => \{[\s\S]*?setDialogueStep\(\(prev: number\) => Math\.min\(prev \+ 1, DATA\.dialogue\.length\)\);\n  \};',
    r'''function Simulation({ scenarios = [], dialogueAnswers, setDialogueAnswers, dialogueStep, setDialogueStep, setTab }: any) {
  const completed = dialogueAnswers.length;
  const done = scenarios.length === 0 ? false : completed >= scenarios.length;
  const current = scenarios[Math.min(dialogueStep, Math.max(0, scenarios.length - 1))] || {};

  const [inputText, setInputText] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);

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
  };''',
    new_content
)
print("Replaced Simulation signature and variables:", count)

# 4. Update Simulation UI Headers
new_content, count = re.subn(
    r'<div style=\{\{ display: \'flex\', justifyContent: \'space-between\', alignItems: \'center\' \}\}>[\s\S]*?<strong>Objectif:</strong> \{DATA\.scenario\.goal\}</div>\s*</div>\s*</div>',
    r'''<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>Scénario: {current.category || "Général"}</div>
            <div style={{ fontSize: 13, color: T.inkSoft, marginTop: 2 }}><strong>Objectif:</strong> {current.learners_task || "..."}</div>
          </div>
        </div>''',
    new_content
)
print("Replaced Simulation UI Headers:", count)

# 5. Update Simulation UI Map
new_content, count = re.subn(
    r'<div style=\{\{ background: T\.surface, padding: 16, borderRadius: 12, display: \'flex\', flexDirection: \'column\', gap: 12 \}\}>[\s\S]*?\{DATA\.dialogue\.map\(\(turn, index\) => \{[\s\S]*?\}\)\}\s*</div>',
    r'''<div style={{ background: T.surface, padding: 16, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
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
        </div>''',
    new_content
)
print("Replaced Simulation UI Map:", count)

# 6. Update Simulation UI Input
new_content, count = re.subn(
    r'\{!done \? \([\s\S]*?<p style=\{\{ fontSize: 13, fontWeight: 600, color: T\.ink, margin: 0 \}\}>Que répondez-vous \?</p>[\s\S]*?\{current\.choices\.map\(\(choice, idx\) => \([\s\S]*?\{choice\}[\s\S]*?</button>\s*\)\)\}\s*</div>\s*\) : \(',
    r'''{!done && current.id ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
          </div>
        ) : (''',
    new_content
)
print("Replaced Simulation UI Input:", count)

# 7. Update Overview Component
new_content, count = re.subn(
    r'function Overview\(\) \{\s*return \(\s*<div style=\{\{ display: \'flex\', flexDirection: \'column\', gap: 28 \}\}>\s*\{\/\* Stats \*\/\}\s*<div style=\{\{ display: \'grid\', gridTemplateColumns: \'repeat\(auto-fit, minmax\(190px, 1fr\)\)\', gap: 18 \}\}>\s*<Stat label="Score global" value="89" sub="Top 12% de la promo" accent=\{T\.sage\} />\s*<Stat label="Simulations" value="12" sub="8 réussies · 4 restantes" accent=\{T\.teal\} />',
    r'''function Overview({ dialogueAnswers }: any) {
  let avgScore = 89;
  let sims = 12;
  if (dialogueAnswers && dialogueAnswers.length > 0) {
     const scores = dialogueAnswers.map((a: any) => {
        const s = a?.evaluation?.scores;
        return s ? (s.empathy + s.clarity + s.accuracy) / 3 : 0;
     });
     avgScore = Math.round(scores.reduce((a:number,b:number)=>a+b, 0) / scores.length);
     sims = dialogueAnswers.length;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 18 }}>
        <Stat label="Score global" value={avgScore.toString()} sub="Basé sur l'IA" accent={T.sage} />
        <Stat label="Simulations" value={sims.toString()} sub="Cas traités" accent={T.teal} />''',
    new_content
)
print("Replaced Overview Component:", count)

if len(new_content) != len(content):
    print("New length:", len(new_content))
    with open("src/App.tsx", "w", encoding="utf-8") as f:
        f.write(new_content)
else:
    print("No changes were saved. Regexes didn't match anything.")

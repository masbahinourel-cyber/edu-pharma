import re

with open("src/App.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update App state
app_state_target = """  const [prep, setPrep] = useState<string[]>([]);
  const [dialogueAnswers, setDialogueAnswers] = useState<number[]>([]);
  const [dialogueStep, setDialogueStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});"""

app_state_replacement = """  const [prep, setPrep] = useState<string[]>([]);
  const [dialogueAnswers, setDialogueAnswers] = useState<any[]>([]);
  const [dialogueStep, setDialogueStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [scenarios, setScenarios] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://localhost:8001/api/scenarios')
      .then(res => res.json())
      .then(data => {
        if (data.scenarios) setScenarios(data.scenarios);
      })
      .catch(err => console.error("Error fetching scenarios:", err));
  }, []);"""

content = content.replace(app_state_target, app_state_replacement)

# 2. Update views mapping
views_target = """    overview: <Overview />,
    preparation: <Preparation prep={prep} setPrep={setPrep} />,
    simulation: <Simulation dialogueAnswers={dialogueAnswers} setDialogueAnswers={setDialogueAnswers} dialogueStep={dialogueStep} setDialogueStep={setDialogueStep} setTab={setTab} />,
    verifications: <Verifications quizAnswers={quizAnswers} setQuizAnswers={setQuizAnswers} />,
    parcours: <Parcours prep={prep} dialogueAnswers={dialogueAnswers} quizAnswers={quizAnswers} setTab={setTab} resetAll={resetAll} />,"""

views_replacement = """    overview: <Overview dialogueAnswers={dialogueAnswers} />,
    preparation: <Preparation prep={prep} setPrep={setPrep} />,
    simulation: <Simulation scenarios={scenarios} dialogueAnswers={dialogueAnswers} setDialogueAnswers={setDialogueAnswers} dialogueStep={dialogueStep} setDialogueStep={setDialogueStep} setTab={setTab} />,
    verifications: <Verifications quizAnswers={quizAnswers} setQuizAnswers={setQuizAnswers} />,
    parcours: <Parcours prep={prep} dialogueAnswers={dialogueAnswers} quizAnswers={quizAnswers} setTab={setTab} resetAll={resetAll} />,"""

content = content.replace(views_target, views_replacement)

# 3. Update Simulation Component
sim_target = """function Simulation({ dialogueAnswers, setDialogueAnswers, dialogueStep, setDialogueStep, setTab }: any) {
  const completed = dialogueAnswers.length;
  const done = completed >= DATA.dialogue.length;
  const current = DATA.dialogue[Math.min(dialogueStep, DATA.dialogue.length - 1)];

  const handleChoice = (index: number) => {
    setDialogueAnswers((prev: number[]) => {
      const next = [...prev];
      next[dialogueStep] = index;
      return next;
    });
    setDialogueStep((prev: number) => Math.min(prev + 1, DATA.dialogue.length));
  };"""

sim_replacement = """function Simulation({ scenarios, dialogueAnswers, setDialogueAnswers, dialogueStep, setDialogueStep, setTab }: any) {
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
  };"""

content = content.replace(sim_target, sim_replacement)

sim_ui_target1 = """        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>{DATA.scenario.customer}</div>
            <div style={{ fontSize: 13, color: T.inkSoft, marginTop: 2 }}>{DATA.scenario.context}</div>
            <div style={{ fontSize: 12, color: T.dust, marginTop: 4 }}><strong>Objectif:</strong> {DATA.scenario.goal}</div>
          </div>
        </div>"""

sim_ui_replacement1 = """        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: T.ink }}>Scénario: {current.category || "Général"}</div>
            <div style={{ fontSize: 13, color: T.inkSoft, marginTop: 2 }}><strong>Objectif:</strong> {current.learners_task || "..."}</div>
          </div>
        </div>"""

content = content.replace(sim_ui_target1, sim_ui_replacement1)

sim_ui_target2 = """        <div style={{ background: T.surface, padding: 16, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {DATA.dialogue.map((turn, index) => {
            if (index > dialogueStep && !done) return null;
            return (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 11, color: T.dust, marginBottom: 4 }}>Client</span>
                  <div style={{ background: T.white, padding: '10px 14px', borderRadius: '0 14px 14px 14px', fontSize: 14, color: T.ink, border: `1px solid ${T.border}` }}>
                    {turn.text}
                  </div>
                </div>
                {dialogueAnswers[index] !== undefined && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: 11, color: T.dust, marginBottom: 4 }}>Vous</span>
                    <div style={{ background: T.sagePale, padding: '10px 14px', borderRadius: '14px 0 14px 14px', fontSize: 14, color: T.sageDark, border: `1px solid ${T.border}` }}>
                      {turn.choices[dialogueAnswers[index]]}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>"""

sim_ui_replacement2 = """        <div style={{ background: T.surface, padding: 16, borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
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
        </div>"""

content = content.replace(sim_ui_target2, sim_ui_replacement2)

sim_ui_target3 = """        {!done ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: T.ink, margin: 0 }}>Que répondez-vous ?</p>
            {current.choices.map((choice, idx) => (
              <button key={idx} onClick={() => handleChoice(idx)} style={{
                background: T.white, border: `1px solid ${T.border}`, borderRadius: 10, padding: '12px 16px',
                textAlign: 'left', fontSize: 14, color: T.ink, cursor: 'pointer', transition: 'border 0.2s',
              }}
                onMouseOver={e => (e.currentTarget.style.borderColor = T.sage)}
                onMouseOut={e => (e.currentTarget.style.borderColor = T.border)}
              >
                {choice}
              </button>
            ))}
          </div>
        ) : ("""

sim_ui_replacement3 = """        {!done && current ? (
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
        ) : ("""

content = content.replace(sim_ui_target3, sim_ui_replacement3)

# 4. Update Overview Component
overview_target = """function Overview() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 18 }}>
        <Stat label="Score global" value="89" sub="Top 12% de la promo" accent={T.sage} />
        <Stat label="Simulations" value="12" sub="8 réussies · 4 restantes" accent={T.teal} />"""

overview_replacement = """function Overview({ dialogueAnswers }: any) {
  let avgScore = 89;
  let sims = 12;
  if (dialogueAnswers && dialogueAnswers.length > 0) {
     const scores = dialogueAnswers.map((a: any) => {
        const s = a.evaluation?.scores;
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
        <Stat label="Simulations" value={sims.toString()} sub="Cas traités" accent={T.teal} />"""

content = content.replace(overview_target, overview_replacement)

with open("src/App.tsx", "w", encoding="utf-8") as f:
    f.write(content)

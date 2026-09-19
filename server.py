from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
import psycopg2.extras
import urllib.parse
from chatbot_graph import app as langgraph_app, DB_URL
from langchain_core.messages import HumanMessage
import json

app = FastAPI()

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EvaluateRequest(BaseModel):
    scenario_id: str
    user_text: str

@app.get("/api/scenarios")
def get_scenarios():
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM public.pharmacist_scenarios ORDER BY created_at DESC;")
        rows = cur.fetchall()
        
        from chatbot_graph import llm
        from langchain_core.messages import SystemMessage
        
        scenarios = []
        for row in rows:
            scenario = dict(row)
            raw_choices = scenario.get('guided_choices')
            
            # Ensure choices is a list (handle string "  ", None, or dicts)
            choices = []
            if isinstance(raw_choices, list):
                choices = raw_choices
            elif isinstance(raw_choices, str):
                try:
                    parsed = json.loads(raw_choices)
                    if isinstance(parsed, list):
                        choices = parsed
                except:
                    pass
            
            # If there are less than 3 choices, generate a distractor and save it
            if len(choices) < 3:
                try:
                    prompt = f"""
                    Tu es un expert en pharmacie. Crée une troisième option FAUSSE (un "distracteur") pour un QCM.
                    Contexte patient : "{scenario.get('customer_opening')}"
                    Objectif : "{scenario.get('learners_task')}"
                    Options existantes :
                    1. {choices[0]['option'] if len(choices) > 0 else ''}
                    2. {choices[1]['option'] if len(choices) > 1 else ''}
                    
                    Génère une 3ème option très courte (1 ou 2 phrases max) qui semble plausible mais qui est incorrecte ou non-optimale pour le patient, ainsi que la réaction du patient.
                    Renvoie STRICTEMENT un JSON au format:
                    {{
                        "option": "texte de la fausse option",
                        "reaction": "réaction perplexe ou négative du patient",
                        "is_optimal": false
                    }}
                    """
                    response = llm.invoke([SystemMessage(content=prompt)])
                    new_choice = json.loads(response.content)
                    choices.append(new_choice)
                    
                    # Save back to database
                    update_cur = conn.cursor()
                    update_cur.execute(
                        "UPDATE public.pharmacist_scenarios SET guided_choices = %s::jsonb WHERE id = %s",
                        (json.dumps(choices), scenario['id'])
                    )
                    conn.commit()
                    update_cur.close()
                except Exception as ex:
                    print(f"Failed to generate distractor for {scenario['id']}:", ex)

            scenario['guided_choices'] = choices
            scenario['id'] = str(scenario['id'])
            scenario['created_at'] = str(scenario['created_at'])
            scenarios.append(scenario)
            
        cur.close()
        conn.close()
            
        return {"scenarios": scenarios}
    except Exception as e:
        print("DB Error:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/evaluate")
def evaluate_response(req: EvaluateRequest):
    try:
        inputs = {
            "messages": [HumanMessage(content=req.user_text)], 
            "scenario_id": req.scenario_id
        }
        
        # Invoke LangGraph app
        result = langgraph_app.invoke(inputs)
        
        # Get the last message content (which should be JSON string from DeepSeek)
        response_text = result["messages"][-1].content
        
        # Parse the JSON string safely
        try:
            evaluation = json.loads(response_text)
        except json.JSONDecodeError:
            evaluation = {
                "feedback": response_text,
                "scores": {
                    "empathy": 0,
                    "clarity": 0,
                    "accuracy": 0
                }
            }
            
        return evaluation
    except Exception as e:
        print("Evaluation Error:", e)
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)

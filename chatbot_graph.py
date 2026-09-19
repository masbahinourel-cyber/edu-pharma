import os
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
import psycopg2
import psycopg2.extras
import urllib.parse
import json

# 1. Credentials (To be filled manually or via environment variables)
DB_URL = os.environ.get("DATABASE_URL", "")
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")

# DeepSeek uses OpenAI's API structure
llm = ChatOpenAI(
    model="deepseek-chat", 
    api_key=DEEPSEEK_API_KEY, 
    base_url="https://api.deepseek.com/v1",
    model_kwargs={"response_format": {"type": "json_object"}}
)

# 2. Define Workflow State
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    scenario_id: str
    scenario_data: dict

# 3. Define Nodes
def fetch_scenario(state: AgentState):
    """Retrieves the active scenario from Supabase to give DeepSeek context."""
    scenario = {}
    try:
        conn = psycopg2.connect(DB_URL)
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        cur.execute("SELECT * FROM public.pharmacist_scenarios WHERE id = %s", (state['scenario_id'],))
        row = cur.fetchone()
        if row:
            scenario = dict(row)
        cur.close()
        conn.close()
    except Exception as e:
        print("DB Fetch Error:", e)
    
    system_prompt = SystemMessage(content=f"""
    Tu es un évaluateur expert de pharmaciens.
    L'étudiant répond actuellement à ce scénario :
    - Catégorie : {scenario.get('category', 'Général')}
    - Client dit : "{scenario.get('customer_opening', '')}"
    - Objectif (Task) : "{scenario.get('learners_task', '')}"
    - Astuce (Coaching Hint) : "{scenario.get('coaching_hint', '')}"
    
    L'étudiant va te donner sa réponse libre à ce client.
    Tu dois évaluer la réponse de l'étudiant en fonction de l'objectif et de l'astuce.
    Tu dois retourner ta réponse STRICTEMENT au format JSON avec la structure suivante:
    {{
        "feedback": "Texte de feedback constructif et amical, avec un 'Miaou' occasionnel.",
        "scores": {{
            "empathy": <entier sur 100>,
            "clarity": <entier sur 100>,
            "accuracy": <entier sur 100>
        }}
    }}
    Ne renvoie aucun autre texte que le JSON.
    """)
    return {"messages": [system_prompt], "scenario_data": scenario}

def generate_response(state: AgentState):
    """Passes the context and user query to DeepSeek."""
    response = llm.invoke(state["messages"])
    return {"messages": [response]}

# 4. Build LangGraph
workflow = StateGraph(AgentState)

workflow.add_node("fetch_scenario", fetch_scenario)
workflow.add_node("agent", generate_response)

workflow.add_edge(START, "fetch_scenario")
workflow.add_edge("fetch_scenario", "agent")
workflow.add_edge("agent", END)

# Compile the graph
app = workflow.compile()

if __name__ == "__main__":
    user_input = "Je vous conseille de prendre ce médicament avec un verre d'eau."
    scenario_uuid = "e7b0a70f-1555-46eb-ae46-d25039f7535b"
    
    inputs = {
        "messages": [HumanMessage(content=user_input)], 
        "scenario_id": scenario_uuid
    }
    
    result = app.invoke(inputs)
    print(result["messages"][-1].content)

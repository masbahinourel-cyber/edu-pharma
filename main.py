from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psycopg2
import psycopg2.extras
import urllib.parse
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage

# Initialize FastAPI
app = FastAPI()

# Allow CORS for React app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os

# Configuration for Database & AI
DB_URL = os.environ.get("DATABASE_URL", "")
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "")

llm = ChatOpenAI(
    model="deepseek-chat", 
    api_key=DEEPSEEK_API_KEY, 
    base_url="https://api.deepseek.com/v1"
)

# LangGraph Setup
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    scenario_id: str

def fetch_scenario(state: AgentState):
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
    Tu es Pharmachat, un chat-pharmacien assistant. Parle brièvement, sois amical, et ajoute un 'Miaou' occasionnel.
    L'étudiant travaille actuellement sur ce scénario :
    - Catégorie : {scenario.get('category', 'Général')}
    - Client dit : "{scenario.get('customer_opening', '')}"
    - Astuce : {scenario.get('coaching_hint', '')}
    
    Guide l'étudiant s'il pose des questions sur ce scénario.
    """)
    return {"messages": [system_prompt]}

def generate_response(state: AgentState):
    response = llm.invoke(state["messages"])
    return {"messages": [response]}

workflow = StateGraph(AgentState)
workflow.add_node("fetch_scenario", fetch_scenario)
workflow.add_node("agent", generate_response)
workflow.add_edge(START, "fetch_scenario")
workflow.add_edge("fetch_scenario", "agent")
workflow.add_edge("agent", END)
lang_app = workflow.compile()

# API Endpoints
class ChatRequest(BaseModel):
    message: str
    scenario_id: str = "e7b0a70f-1555-46eb-ae46-d25039f7535b"

@app.post("/api/chat")
def chat_endpoint(req: ChatRequest):
    inputs = {
        "messages": [HumanMessage(content=req.message)], 
        "scenario_id": req.scenario_id
    }
    result = lang_app.invoke(inputs)
    return {"reply": result["messages"][-1].content}

# Run server on import
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

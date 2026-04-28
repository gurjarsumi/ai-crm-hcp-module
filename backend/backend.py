import os
from typing import List, Optional, Dict, Any, Annotated
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Text
from sqlalchemy.orm import declarative_base, sessionmaker

# LangGraph & Langchain imports
from typing_extensions import TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, ToolMessage
from langchain_core.tools import tool
from langchain_core.runnables import RunnableConfig

# ==========================================
# 1. DATABASE SETUP (SQLAlchemy)
# ==========================================
DATABASE_URL = "sqlite:///./crm_database.db" 

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class InteractionModel(Base):
    __tablename__ = "interactions"
    id = Column(Integer, primary_key=True, index=True)
    hcp_name = Column(String(255), index=True)
    interaction_type = Column(String(100))
    date = Column(String(50))
    time = Column(String(50))
    attendees = Column(Text)
    topics_discussed = Column(Text)
    materials_shared = Column(Text)
    sentiment = Column(String(50))
    outcomes = Column(Text)
    follow_up = Column(Text)

Base.metadata.create_all(bind=engine)

# ==========================================
# 2. LANGGRAPH TOOLS
# ==========================================

@tool
def log_interaction(
    hcp_name: str, topics: str, sentiment: str, 
    interaction_type: str = "Meeting", date: str = "", time: str = ""
) -> str:
    """
    Tool 1: Captures and structures interaction data from a conversation.
    Use this when the user describes a new meeting they just had.
    """
    return f"Successfully extracted interaction with {hcp_name}."

@tool
def edit_interaction(field_to_update: str, new_value: str) -> str:
    """
    Tool 2: Modifies an existing or draft interaction. 
    Valid fields to update are: 'sentiment', 'topics', 'hcp_name', 'interaction_type'.
    """
    return f"Successfully updated {field_to_update} to {new_value}."

@tool
def get_hcp_history(hcp_name: str) -> str:
    """Tool 3: Retrieves previous background information and interaction history for a specific HCP."""
    return f"Database Record: {hcp_name} is a top prescriber of Product X in this region. Last met 2 months ago. High engagement."

@tool
def search_product_materials(product_name: str) -> str:
    """Tool 4: Searches for available brochures, clinical trial data, or samples for a product."""
    return f"Available materials for {product_name}: Clinical Brochure PDF, Sample Pack V2, Dosage Guidelines."

@tool
def schedule_followup(date_time: str, task_description: str) -> str:
    """Tool 5: Schedules a follow-up task or calendar event."""
    return f"Successfully scheduled: {task_description} for {date_time}."

tools = [log_interaction, edit_interaction, get_hcp_history, search_product_materials, schedule_followup]

# ==========================================
# 3. LANGGRAPH AGENT SETUP (With Memory)
# ==========================================

class State(TypedDict):
    messages: Annotated[list, add_messages]
    extracted_form_data: Dict[str, Any]

llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0)
llm_with_tools = llm.bind_tools(tools)

def chatbot_node(state: State):
    msg = llm_with_tools.invoke(state["messages"])
    return {"messages": [msg]}

def tool_node(state: State):
    last_message = state["messages"][-1]
    extracted = state.get("extracted_form_data", {})
    responses = []
    
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        for tool_call in last_message.tool_calls:
            name = tool_call["name"]
            args = tool_call["args"]
            tool_call_id = tool_call["id"]
            
            # --- FRONTEND STATE MAPPING ---
            if name == "log_interaction":
                extracted.update({
                    "hcpName": args.get("hcp_name", ""),
                    "topics": args.get("topics", ""),
                    "sentiment": args.get("sentiment", "Neutral").capitalize(), 
                    "interactionType": args.get("interaction_type", "Meeting").capitalize()
                })
            elif name == "edit_interaction":
                field = args.get("field_to_update", "").lower()
                val = args.get("new_value", "")
                
                if "sentiment" in field: extracted["sentiment"] = val.capitalize()
                elif "topic" in field: extracted["topics"] = val
                elif "name" in field: extracted["hcpName"] = val
                elif "type" in field: extracted["interactionType"] = val.capitalize()
            
            elif name == "schedule_followup":
                date_val = args.get("date_time", "")
                task_val = args.get("task_description", "")
                extracted["followUp"] = f"{task_val} scheduled for {date_val}"
            
            # --- EXECUTE TOOL ---
            tool_instance = next((t for t in tools if t.name == name), None)
            tool_result = "Success"
            if tool_instance:
                tool_result = tool_instance.invoke(args)
                
            responses.append(ToolMessage(content=str(tool_result), tool_call_id=tool_call_id))
            
    return {
        "messages": responses,
        "extracted_form_data": extracted
    }

def should_continue(state: State):
    last_message = state["messages"][-1]
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        return "tools"
    return END

graph_builder = StateGraph(State)
graph_builder.add_node("chatbot", chatbot_node)
graph_builder.add_node("tools", tool_node)
graph_builder.add_edge(START, "chatbot")
graph_builder.add_conditional_edges("chatbot", should_continue, {"tools": "tools", END: END})
graph_builder.add_edge("tools", "chatbot")

memory = MemorySaver()
crm_agent = graph_builder.compile(checkpointer=memory)

# ==========================================
# 4. FASTAPI ENDPOINTS
# ==========================================

app = FastAPI(title="AI-First CRM API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

@app.post("/api/chat")
async def chat_with_agent(req: ChatRequest):
    try:
        config: RunnableConfig = {"configurable": {"thread_id": "demo_session_1"}}
        
        initial_state: State = {
            "messages": [HumanMessage(content=req.message)],
            "extracted_form_data": {} 
        }
        
        result = crm_agent.invoke(initial_state, config=config)
        
        final_message = result["messages"][-1].content
        extracted_data = result.get("extracted_form_data", {})
        
        return {
            "response": final_message,
            "extracted_data": extracted_data
        }
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))

class SaveInteractionRequest(BaseModel):
    hcpName: str
    interactionType: str
    date: str
    time: str
    attendees: str
    topics: str
    materials: str
    samples: str
    sentiment: str
    outcomes: str
    followUp: str

@app.post("/api/interactions")
async def save_interaction(data: SaveInteractionRequest):
    db = SessionLocal()
    try:
        new_record = InteractionModel(
            hcp_name=data.hcpName,
            interaction_type=data.interactionType,
            date=data.date,
            time=data.time,
            attendees=data.attendees,
            topics_discussed=data.topics,
            materials_shared=data.materials,
            sentiment=data.sentiment,
            outcomes=data.outcomes,
            follow_up=data.followUp
        )
        db.add(new_record)
        db.commit()
        db.refresh(new_record)
        return {"status": "success", "id": new_record.id}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
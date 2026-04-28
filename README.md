# AI-First CRM: HCP Interaction Module

## Overview
This project is an AI-first Customer Relationship Management (CRM) module designed for Life Science field representatives. It features a dual-interface "Log Interaction Screen" that allows representatives to log Healthcare Professional (HCP) interactions via a traditional structured form or a conversational AI chat interface. 

The AI agent automatically parses natural language, extracts key entities, executes tools, and populates the form state in real-time.

## Tech Stack
* **Frontend:** React, Redux Toolkit, Tailwind CSS, Lucide React
* **Backend:** Python, FastAPI, SQLAlchemy (SQLite configured, easily adaptable to PostgreSQL)
* **AI Framework:** LangGraph, LangChain
* **LLM:** Groq (`llama-3.1-8b-instant`)

## Features & LangGraph Tools
The LangGraph agent is equipped with a Memory Saver and 5 specific tools to manage interactions:
1. `log_interaction`: Extracts meeting details (Name, Topics, Sentiment) and updates the Redux store.
2. `edit_interaction`: Allows conversational modification of draft form data.
3. `get_hcp_history`: Retrieves mock backend data regarding past HCP engagements.
4. `search_product_materials`: Looks up available samples and clinical brochures.
5. `schedule_followup`: Extracts dates/tasks and populates the follow-up action plan.

## Setup Instructions

### 1. Backend Setup
1. Open a terminal and navigate to the `backend` directory.
2. Create and activate a virtual environment:
   * Windows: `python -m venv venv` and `venv\Scripts\activate`
   * Mac/Linux: `python3 -m venv venv` and `source venv/bin/activate`
3. Install dependencies:
   `pip install fastapi uvicorn sqlalchemy langgraph langchain-groq pydantic typing-extensions`
4. Set your Groq API Key:
   * Windows (CMD): `set GROQ_API_KEY="your_api_key"`
   * Mac/Linux: `export GROQ_API_KEY="your_api_key"`
5. Start the server:
   `uvicorn backend:app --reload`

### 2. Frontend Setup
1. Open a new terminal and navigate to the `frontend` directory.
2. Install dependencies:
   `npm install`
3. Start the development server:
   `npm run dev`
4. Open the provided localhost URL in your browser.
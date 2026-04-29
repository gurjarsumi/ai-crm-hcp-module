import React, { useState } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { Send, Calendar, Clock, Search, Plus, Sparkles, User, FileText } from 'lucide-react';

// 1. REDUX SETUP (Strict Assignment Requirement)

const initialFormState = {
  hcpName: '',
  interactionType: 'Meeting',
  date: '2025-04-19',
  time: '19:30',
  attendees: '',
  topics: '',
  materials: '',
  samples: '',
  sentiment: 'Neutral',
  outcomes: '',
  followUp: ''
};

// Create the Redux Slice
const formSlice = createSlice({
  name: 'interactionForm',
  initialState: initialFormState,
  reducers: {
    updateField: (state, action) => {
      state[action.payload.field] = action.payload.value;
    },
    updateMultipleFields: (state, action) => {
      return { ...state, ...action.payload };
    },
    resetForm: () => initialFormState
  }
});

const { updateField, updateMultipleFields, resetForm } = formSlice.actions;

// Configure the Redux Store
const store = configureStore({
  reducer: {
    form: formSlice.reducer
  }
});

// 2. MAIN APPLICATION COMPONENT

function CRMApp() {
  // Use Redux Hooks instead of Context
  const dispatch = useDispatch();
  const formData = useSelector((state) => state.form);

  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', text: 'Hello! I am your AI Assistant. Log interaction details here (e.g. "Met Dr. Smith, discussed Product X efficacy, positive sentiment") or ask for help.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Handle Form Input changes (Dispatch to Redux)
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    dispatch(updateField({ field: name, value }));
  };

  // Handle Chat Submission (Triggers LangGraph Backend)
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatInput('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });

      const data = await response.json();

      setChatMessages(prev => [...prev, { role: 'assistant', text: data.response }]);

      // If LangGraph extracted entities, update Redux Store!
      if (data.extracted_data && Object.keys(data.extracted_data).length > 0) {
        dispatch(updateMultipleFields(data.extracted_data));
      }

    } catch (error) {
      console.error("Error connecting to AI Agent:", error);
      setChatMessages(prev => [...prev, { role: 'assistant', text: 'Error: Could not connect to AI Agent. Is the backend running locally on port 8000?' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Final Submission
  const handleLogInteraction = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        alert("Interaction Logged Successfully!");
        dispatch(resetForm());
      } else {
        alert("Failed to save interaction. Is the backend running?");
      }
    } catch (error) {
      alert("Failed to connect to the database. Make sure your FastAPI backend is running!");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-sm text-gray-800" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6">

        {/* LEFT COLUMN: Structured Form */}
        <div className="grow bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-900 border-b pb-4">Log HCP Interaction</h2>

          <div className="space-y-5">
            {/* HCP Name & Interaction Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">HCP Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text" name="hcpName" value={formData.hcpName} onChange={handleInputChange}
                    placeholder="Search or select HCP..."
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Interaction Type</label>
                <select
                  name="interactionType" value={formData.interactionType} onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                >
                  <option>Meeting</option>
                  <option>Email</option>
                  <option>Phone Call</option>
                  <option>Event</option>
                </select>
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="date" name="date" value={formData.date} onChange={handleInputChange}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Time</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="time" name="time" value={formData.time} onChange={handleInputChange}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Attendees */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Attendees</label>
              <input
                type="text" name="attendees" value={formData.attendees} onChange={handleInputChange}
                placeholder="Enter names or search..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none"
              />
            </div>

            {/* Topics Discussed */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Topics Discussed</label>
              <textarea
                name="topics" value={formData.topics} onChange={handleInputChange}
                rows="3" placeholder="Enter key discussion points..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none resize-none"
              ></textarea>
              <button className="flex items-center text-xs text-blue-600 mt-2 font-medium bg-blue-50 px-3 py-1.5 rounded-md hover:bg-blue-100 transition">
                <Sparkles className="w-3 h-3 mr-1" /> Summarize from Voice Note (Requires Consent)
              </button>
            </div>

            {/* Materials & Samples */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <h3 className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">Materials Shared / Samples Distributed</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-gray-700">Materials Shared</span>
                    <button className="text-xs flex items-center text-gray-600 border px-2 py-1 bg-white rounded hover:bg-gray-100"><Search className="w-3 h-3 mr-1" /> Search/Add</button>
                  </div>
                  <p className="text-xs text-gray-400 italic">No materials added</p>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-medium text-gray-700">Samples Distributed</span>
                    <button className="text-xs flex items-center text-gray-600 border px-2 py-1 bg-white rounded hover:bg-gray-100"><Plus className="w-3 h-3 mr-1" /> Add Sample</button>
                  </div>
                  <p className="text-xs text-gray-400 italic">No samples added</p>
                </div>
              </div>
            </div>

            {/* Sentiment */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Observed/Inferred HCP Sentiment</label>
              <div className="flex gap-6">
                {['Positive', 'Neutral', 'Negative'].map(opt => (
                  <label key={opt} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio" name="sentiment" value={opt}
                      checked={formData.sentiment === opt} onChange={handleInputChange}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Outcomes & Follow up */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Outcomes</label>
              <textarea
                name="outcomes" value={formData.outcomes} onChange={handleInputChange}
                rows="2" placeholder="Key outcomes or agreements..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none resize-none"
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Follow-up Actions</label>
              <textarea
                name="followUp" value={formData.followUp} onChange={handleInputChange}
                rows="2" placeholder="Enter next steps or tasks..."
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none resize-none"
              ></textarea>
            </div>

          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleLogInteraction}
              className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-2 rounded-lg text-sm transition"
            >
              Save Interaction
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: AI Chat Assistant */}
        <div className="w-full lg:w-96 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 h-[85vh]">

          <div className="p-4 border-b border-gray-100 bg-blue-50/50 rounded-t-xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="font-semibold text-gray-800">AI Assistant</h3>
              <p className="text-xs text-gray-500">Log interaction via chat</p>
            </div>
          </div>

          <div className="grow p-4 overflow-y-auto flex flex-col gap-3">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-500 p-3 rounded-lg text-xs italic">
                  Analyzing and extracting...
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
            <form onSubmit={handleChatSubmit} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Describe interaction..."
                className="grow px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="bg-gray-600 hover:bg-gray-700 text-white p-2 px-4 rounded-lg transition flex items-center disabled:opacity-50"
              >
                <Send className="w-4 h-4 mr-1" /> Log
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}

// Wrapper to provide Redux Store
export default function App() {
  return (
    <Provider store={store}>
      <CRMApp />
    </Provider>
  );
}

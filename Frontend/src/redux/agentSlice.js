
import {  createSlice } from "@reduxjs/toolkit";

const agentSlice = createSlice({
  name: "agent",

  initialState: {
    agents: null,
    selectedAgent:"",
    agentsLoading:false,
    
  },

  reducers: {
    setAgents: (state, action) => {
      state.agents = action.payload;
    
    },

    setSelectedAgent: (state,action) => {
      state.selectedAgent = action.payload;
     
    },
    setAgentsLoading: (state,action) => {
      state.agentsLoading = action.payload;
     
    },
    setDeleteAgent:(state,action)=>{
const id = action.payload
    state.agents = state.agents.filter((a) => a?._id !== id
        
      );
    }
  },
});

export const { setDeleteAgent,setAgents, setSelectedAgent ,setAgentsLoading } = agentSlice.actions;
export default agentSlice.reducer;
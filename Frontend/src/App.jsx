import React, { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import { me } from "./features/auth";
import { useDispatch, useSelector } from "react-redux";
import { setUserData } from "./redux/userSlice";
import Home from "./pages/Home";
import Integration from "./pages/Integration";
import CreateAgent from "./pages/CreateAgent";
import Agents from "./pages/Agents";
import { chat } from "./features/chat";
import {  setAgents, setAgentsLoading } from "./redux/agentSlice";
import { getAllAgent } from "./features/agents/agentApi";
import Pricing from "./pages/Pricing";

function App() {
  const dispatch = useDispatch();
  
  const { userData, loading } = useSelector((state) => state.auth);
  const [error ,setError] = useState("")

  useEffect(() => {
    const fetchUser  = async () => {
      try {
        const  data  = await me();
        dispatch(setUserData(data));
       
      } catch (error) {
        console.error("Authentication error:", error);
      }
    };
    fetchUser ()
  },[dispatch]);

   const loadAgents = async () => {
      dispatch(setAgentsLoading(true))
    try {
      setError("");
      const data = await getAllAgent();
      dispatch(setAgents(data))
      dispatch(setAgentsLoading(false))
    } catch (err) {
      dispatch(setAgentsLoading(false))
      setError(
        err?.response?.data?.message || "Failed to load agents."
      );
    } 
  };
   useEffect(() => {
    loadAgents();
  }, []);

    if (loading) {
    return <div>Checking authentication...</div>;
  }


  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={userData ? <Home/> : <Navigate to={ "/login"} /> } />

          <Route
            path="/login"
            element={userData ? <Navigate to={"/"} /> : <Login />}
          />

          <Route path="/agents" element={userData ? <Agents/> : <Navigate to={ "/login"} /> } />

          <Route path="/integrations" element={userData ? <Integration/> : <Navigate to={ "/login"} /> } />

          <Route path="/pricing" element={userData ? <Pricing/> : <Navigate to={ "/login"} /> } />

          <Route path="/agents/new" element={userData ? <CreateAgent/> : <Navigate to={ "/login"} /> } />
        
    
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;

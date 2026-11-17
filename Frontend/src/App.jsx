import React, { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import { me } from "./features/auth";
import { useDispatch, useSelector } from "react-redux";
import { setUserData } from "./redux/userSlice";
import Home from "./pages/Home";
import Integration from "./pages/Integration";
import CreateAgent from "./pages/CreateAgent";
import Agents from "./pages/Agents";

function App() {
  const dispatch = useDispatch();
  
  const { userData, loading, error } = useSelector((state) => state.auth);

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

          <Route path="/integration" element={userData ? <Integration/> : <Navigate to={ "/login"} /> } />

          <Route path="/agents/new" element={userData ? <CreateAgent/> : <Navigate to={ "/login"} /> } />
        
    
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;

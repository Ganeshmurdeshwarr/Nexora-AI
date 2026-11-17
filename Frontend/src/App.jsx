import React, { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Login from "./pages/Login";
import { me } from "./features/auth";
import { useDispatch, useSelector } from "react-redux";
import { setUserData } from "./redux/userSlice";
import Home from "./pages/Home";

function App() {
  const dispatch = useDispatch();

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await me();
        dispatch(setUserData(data));
      } catch (error) {}
    };
  });

  const { userData, loading, error } = useSelector((state) => state.auth);


  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={userData ? <Navigate to={"/"} /> : <Login />}
          />

          <Route path="/" element={userData ? <Home/> : <Navigate to={ "/login"} /> } />

    
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;

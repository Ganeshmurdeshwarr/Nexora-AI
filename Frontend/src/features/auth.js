import api from "@/api";

export const login = async (token) => {
  try {
    const { data } = await api.post("/api/auth/login", { token });
    console.log(data);
    return data;
  } catch (error) {
    console.log(error);
  }
};

export const logout = async () => {
  const { data } = await api.get("/api/auth/logout");
  return data;
};

export const me = async () => {
  try {
    const { data } = await api.get("/api/auth/me");
    return data;
  } catch (error) {
    console.log(error);
  }
 
};

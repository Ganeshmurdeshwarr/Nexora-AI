import api from "@/api";

export const createPayment = async (plan) => {
  const { data } = await api.post("/api/payments/create", {
    plan,
  });

  return data;
};

export const verify = async ( body ) => {
  const { data } = await api.post("/api/payments/verify", body);

  return data;
};



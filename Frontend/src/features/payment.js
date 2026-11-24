import api from "@/api";

export const createPayment = async (plan) => {
  try {
    const {data} = await api.post("/api/payment/create", {
      plan,
    });

    return data;
  } catch (error) {
return (error)  }
};

export const verify = async ( body ) => {
  const {data} = await api.post("/api/payment/verify",body);

  return data;
};




import razorpay from "../config/razorpay.js";

import crypto from "crypto";
import mongoose from "mongoose";
import Payment from "../models/payment.model.js";
import User from "../models/user.model.js";


const Plans = {
  pro: {
    name: "Pro",
    amount: 29900, 
    credits: 500,
  },

  team: {
    name: "Team",
    amount: 79900, 
    credits: 2000,
  },
};

export const createOrder = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const { plan } = req.body;
    const selectedPlan = Plans[plan];

    if (!selectedPlan) {
      return res.status(400).json({
        message: "Invalid plan",
      });
    }

    const order = await razorpay.orders.create({
      amount: selectedPlan.amount,
      currency: "INR",
      receipt: `receipt-${Date.now()}`,
      notes: { userId, plan },
    });

    await Payment.create({
      userId,
      plan,
      credits: selectedPlan.credits,
      amount: selectedPlan.amount,
      razorpayOrderId: order.id,
      currency: "INR",
      status: "created",
    });

    return res.status(201).json({
      message: "Order created successfully",
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
      plan: {
        name: selectedPlan.name,
        credits: selectedPlan.credits,
      },
      key_id: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {

    return res.status(500).json({
      message: "Unable to create order",
    });
  }
};

export const verify = async (req, res) => {
  try {
    const userId = req.user._id;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (
      typeof razorpay_order_id !== "string" ||
      typeof razorpay_payment_id !== "string" ||
      typeof razorpay_signature !== "string" ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !/^[a-f\d]{64}$/i.test(razorpay_signature)
    ) {
      return res.status(400).json({
        message: "Payment verification details are required",
      });
    }

    const payment = await Payment.findOne({
      userId,
      razorpayOrderId: razorpay_order_id,
    });

    if (!payment) {
      return res.status(404).json({
        message: "Payment not found",
      });
    }

    if (payment.status === "paid") {
      return res.status(200).json({
        message: "Payment already verified",
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const received = Buffer.from(razorpay_signature, "hex");
    const expected = Buffer.from(generatedSignature, "hex");

    if (
      received.length !== expected.length ||
      !crypto.timingSafeEqual(received, expected)
    ) {
      return res.status(400).json({
        message: "Invalid payment signature",
      });
    }

    let gatewayPayment = await razorpay.payments.fetch(razorpay_payment_id);

    if (
      gatewayPayment.order_id !== razorpay_order_id ||
      gatewayPayment.amount !== payment.amount ||
      gatewayPayment.currency !== payment.currency
    ) {
      return res.status(400).json({
        message: "Payment details do not match the order",
      });
    }

    if (gatewayPayment.status === "authorized") {
      gatewayPayment = await razorpay.payments.capture(
        razorpay_payment_id,
        payment.amount,
        payment.currency,
      );
    }

    if (gatewayPayment.status !== "captured") {
      return res.status(409).json({
        message: "Payment has not been captured",
      });
    }

    const session = await mongoose.startSession();
    let alreadyVerified = false;

    try {
      await session.withTransaction(async () => {
        alreadyVerified = false;

        const updatedPayment = await Payment.findOneAndUpdate(
          {
            _id: payment._id,
            userId,
            status: "created",
          },
          {
            $set: {
              status: "paid",
              razorpayPaymentId: razorpay_payment_id,
            },
          },
          {
            returnDocument: "after",
            session,
          },
        );

        if (!updatedPayment) {
          const currentPayment = await Payment.findById(payment._id).session(
            session,
          );

          if (currentPayment?.status === "paid") {
            alreadyVerified = true;
            return;
          }

          throw new Error("Payment status changed before verification");
        }

        const user = await User.findByIdAndUpdate(
          userId,
          {
            $inc: {
              credits: updatedPayment.credits,
            },
          },
          {
            returnDocument: "after",
            runValidators: true,
            session,
          },
        );

        if (!user) {
          throw new Error("User not found");
        }
      });
    } finally {
      await session.endSession();
    }

    if (alreadyVerified) {
      return res.status(200).json({
        message: "Payment already verified",
      });
    }

    return res.status(200).json({
      message: "Payment verified successfully",
      creditsAdded: payment.credits,
    });
  } catch (error) {

    return res.status(500).json({
      message: "Unable to verify payment",
    });
  }
};

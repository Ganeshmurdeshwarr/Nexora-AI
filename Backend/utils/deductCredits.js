import User from "../models/user.model.js";

export class InsufficientCreditsError extends Error {
  constructor() {
    super("Insufficient credits");
    this.name = "InsufficientCreditsError";
  }
}

const validateCreditRequest = ({ userId, credits }) => {
  if (!userId) {
    throw new Error("User ID is required");
  }

  if (!Number.isInteger(credits) || credits <= 0) {
    throw new Error("Credits must be a positive integer");
  }
};

export const assertSufficientCredits = async ({ userId, credits }) => {
  validateCreditRequest({ userId, credits });

  const userWithEnoughCredits = await User.exists({
    _id: userId,
    credits: { $gte: credits },
  });

  if (!userWithEnoughCredits) {
    const userExists = await User.exists({ _id: userId });

    if (!userExists) {
      throw new Error("User not found");
    }

    throw new InsufficientCreditsError();
  }
};

export const deductCredits = async ({ userId, credits }) => {
  validateCreditRequest({ userId, credits });

  const user = await User.findOneAndUpdate(
    {
      _id: userId,
      credits: { $gte: credits },
    },
    {
      $inc: {
        credits: -credits,
      },
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  if (!user) {
    const existingUser = await User.exists({ _id: userId });

    if (!existingUser) {
      throw new Error("User not found");
    }

    throw new InsufficientCreditsError();
  }

  return {
    success: true,
    creditsDeducted: credits,
    remainingCredits: user.credits,
  };
};

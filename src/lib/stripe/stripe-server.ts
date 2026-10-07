import Stripe from "stripe";

const stripeKey = process.env.STRIPE_SECRET_KEY;

export const stripe = stripeKey
  ? new Stripe(stripeKey, {
      // @ts-expect-error -- Pin API version
      apiVersion: "2024-12-18.acacia",
    })
  : null;

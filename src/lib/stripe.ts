import Stripe from 'stripe';

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      
    });
  }

  return stripeInstance;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getProPriceIds(): { monthly?: string; annual?: string } {
  return {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_MONTHLY,
    annual: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID_ANNUAL,
  };
}

export function hasPriceIds(): boolean {
  const { monthly, annual } = getProPriceIds();
  return !!(monthly || annual);
}

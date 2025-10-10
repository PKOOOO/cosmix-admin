import { PaytrailClient } from '@paytrail/paytrail-js-sdk';

if (!process.env.PAYTRAIL_MERCHANT_ID) {
  throw new Error("PAYTRAIL_MERCHANT_ID environment variable is not set");
}

if (!process.env.PAYTRAIL_SECRET_KEY) {
  throw new Error("PAYTRAIL_SECRET_KEY environment variable is not set");
}

// Initialize Paytrail client
export const paytrail = new PaytrailClient({
  merchantId: parseInt(process.env.PAYTRAIL_MERCHANT_ID || '0'),
  secretKey: process.env.PAYTRAIL_SECRET_KEY,
});

// Paytrail payment methods for Finland
export const PAYTRAIL_PAYMENT_METHODS = {
  // Finnish online banks
  NORDEA: 'nordea',
  OSUUSPANKKI: 'osuuspankki',
  DANSKE_BANK: 'danske',
  SASTOPANKKI: 'sastopankki',
  OMA_SASTOPANKKI: 'omasastopankki',
  POP_PANKKI: 'poppankki',
  AKTIA: 'aktia',
  ALANDSBANKEN: 'alandsbanken',
  S_PANKKI: 'spankki',
  
  // Cards
  VISA: 'visa',
  MASTERCARD: 'mastercard',
  AMERICAN_EXPRESS: 'amex',
  
  // Mobile payments
  MOBILEPAY: 'mobilepay',
  SIIRTO: 'siirto',
  
  // Buy now, pay later
  WALLEY: 'walley',
  OP_LASKU: 'oplasku',
} as const;

// Currency for Finland
export const PAYTRAIL_CURRENCY = 'EUR';

// Payment statuses
export const PAYTRAIL_PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired',
} as const;

// Webhook events
export const PAYTRAIL_WEBHOOK_EVENTS = {
  PAYMENT_SUCCESS: 'payment-success',
  PAYMENT_FAILURE: 'payment-failure',
  PAYMENT_CANCELLED: 'payment-cancelled',
  PAYMENT_EXPIRED: 'payment-expired',
} as const;

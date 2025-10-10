# Cosmix Admin - Salon Management System

A comprehensive salon management system built with Next.js, featuring Paytrail payment integration for Finnish businesses.

## Features

- **Admin Panel**: Global category and service management
- **Salon Management**: Create and manage salon locations
- **Service Management**: Parent services and sub-services
- **Booking System**: Customer booking management
- **Payment Processing**: Paytrail integration for Finnish payments
- **User Management**: Role-based access control

## Payment Integration

This application uses **Paytrail** for payment processing, specifically designed for Finnish businesses. Paytrail supports:

- All Finnish online banks (Nordea, Osuuspankki, Danske Bank, etc.)
- Credit and debit cards (Visa, Mastercard, American Express)
- Mobile payments (MobilePay, Siirto)
- Buy now, pay later options (Walley, OP Lasku)

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Paytrail Configuration
PAYTRAIL_MERCHANT_ID=your_merchant_id_here
PAYTRAIL_SECRET_KEY=your_secret_key_here
PAYTRAIL_TEST_MODE=true

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL=your_database_url

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
```

## Getting Started

First, install dependencies:

```bash
npm install
```

Set up your environment variables (see above).

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database Setup

```bash
npx prisma generate
npx prisma db push
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

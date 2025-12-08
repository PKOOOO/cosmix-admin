import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import prismadb from "@/lib/prismadb";

export async function GET() {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return new NextResponse("STRIPE_SECRET_KEY is not configured", { status: 500 });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-11-17.clover",
      typescript: true,
    });

    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const account = await stripe.accounts.create({
      country: "FI",
      type: "custom",
      business_type: "company",
      capabilities: {
        card_payments: {
          requested: true,
        },
        transfers: {
          requested: true,
        },
      },
      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip: "127.0.0.1",
      },
    });

    if (account) {
      const approve = await stripe.accounts.update(account.id, {
        business_profile: {
          mcc: "5999",
          url: "https://cosmix.fi",
        },
        company: {
          address: {
            line1: "123 Main St",
            city: "Helsinki",
            postal_code: "00100",
            state: "Helsinki",
            country: "FI",
          },
          tax_id: "1234567-8",
          name: "Cosmix",
          phone: "+358401234567",
        },
      });
      if (approve) {
        const person = await stripe.accounts.createPerson(account.id, {
          first_name: "John",
          last_name: "Doe",
          relationship: {
            representative: true,
            title: "CEO",
          },
        });
        if (person) {
          const approvePerson = await stripe.accounts.updatePerson(
            account.id,
            person.id,
            {
              address: {
                city: "Helsinki",
                line1: "123 Main St",
                postal_code: "00100",
                state: "Helsinki",
              },
              dob: {
                day: 1,
                month: 1,
                year: 1990,
              },
              ssn_last_4: "1234",
              phone: "+358401234567",
              email: "john.doe@example.com",
              relationship: {
                executive: true,
              },
            }
          );
          if (approvePerson) {
            const owner = await stripe.accounts.createPerson(account.id, {
              first_name: "John",
              last_name: "Doe",
              email: "john.doe@example.com",
              address: {
                city: "Helsinki",
                line1: "123 Main St",
                postal_code: "00100",
                state: "Helsinki",
              },
              dob: {
                day: 1,
                month: 1,
                year: 1990,
              },
              phone: "+358401234567",
              relationship: {
                owner: true,
                percent_ownership: 100,
              },
            });
            if (owner) {
              const complete = await stripe.accounts.update(account.id, {
                company: {
                  owners_provided: true,
                },
              });
              if (complete) {
                const saveAccountId = await prismadb.user.update({
                  where: {
                    clerkId: userId,
                  },
                  data: {
                    stripeId: account.id,
                  },
                });
                if (saveAccountId) {
                  const accountLink = await stripe.accountLinks.create({
                    account: account.id,
                    refresh_url:
                      "http://localhost:3000/api/callback/stripe/refresh",
                    return_url:
                      "http://localhost:3000/api/callback/stripe/success",
                    type: "account_onboarding",
                    collection_options: {
                      fields: "currently_due",
                    },
                  });
                  return NextResponse.json({
                    url: accountLink.url,
                  });
                }
              }
            }
          }
        }
      }
    }
    return new NextResponse("Failed to create Stripe account", { status: 500 });
  } catch (error) {
    console.error(
        'An error occurred when connecting to stripe',
        error
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

import React from "react";

// Minimal, client-safe Clerk stubs. Middleware already enforces bearer auth.

export const auth = () => ({
  userId: null,
  sessionId: null,
  getToken: async () => null,
});

export const currentUser = async (): Promise<any> => null;

export const ClerkProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>;

export const SignedIn = ({ children }: { children: React.ReactNode }) => <>{children}</>;
export const SignedOut = ({ children }: { children: React.ReactNode }) => null;

export const UserButton = (_props?: any) => null;
export const SignIn = (_props?: any) => null;

export const useAuth = () => ({
  isLoaded: true,
  isSignedIn: true, // allow rendering; backend is already gated
  getToken: async () => null,
});

export const useClerk = () => ({
  signOut: async () => {},
});

export const useSignIn = () => ({
  isLoaded: true,
  setActive: async (..._args: any[]) => {},
  signIn: {
    create: async (..._args: any[]) => ({
      status: "complete",
      createdSessionId: "stub-session",
    }),
    prepareSecondFactor: async (..._args: any[]) => {},
    attemptSecondFactor: async (..._args: any[]) => ({
      status: "complete",
      createdSessionId: "stub-session",
    }),
    attemptFirstFactor: async (..._args: any[]) => ({
      status: "complete",
      createdSessionId: "stub-session",
    }),
  },
});

export const useSignUp = () => ({
  isLoaded: true,
  setActive: async (..._args: any[]) => {},
  signUp: {
    create: async (..._args: any[]) => ({
      status: "complete",
      createdSessionId: "stub-session",
    }),
    prepareEmailAddressVerification: async (..._args: any[]) => {},
    attemptEmailAddressVerification: async (..._args: any[]) => ({
      status: "complete",
      createdSessionId: "stub-session",
    }),
  },
});

export type WebhookEvent = any;


import type { Metadata } from "next";

// Linked from the Google OAuth consent screen and the app stores, so it must
// stay publicly reachable (no auth) at https://www.kosmiks.com/privacy.

export const metadata: Metadata = {
  title: "Privacy Policy – Kosmiks",
  description: "How Kosmiks collects, uses and protects your personal data.",
};

const LAST_UPDATED = "23 October 2026";
const CONTACT_EMAIL = "support@kosmiks.com";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-zinc-700">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-zinc-500">Last updated: {LAST_UPDATED}</p>

      <p className="mt-6 leading-relaxed text-zinc-700">
        Kosmiks is a marketplace for booking beauty and wellness services in Finland. This
        policy explains what personal data we collect when you use the Kosmiks mobile app and
        website, why we collect it, and the rights you have under the EU General Data
        Protection Regulation (GDPR).
      </p>

      <Section title="1. Data we collect">
        <p>
          <strong>Account data.</strong> When you sign in with Google or email, we receive your
          name, email address and profile picture. We do not receive your Google password.
        </p>
        <p>
          <strong>Booking data.</strong> The services, salon, date and time you book, your
          booking history, and the reviews you write.
        </p>
        <p>
          <strong>Payment data.</strong> Payments are processed by Stripe. We store a payment
          reference and the amount, but never your full card details.
        </p>
        <p>
          <strong>Location.</strong> With your permission, your device location is used to show
          nearby salons on the map. It is used on the device and is not stored with your account.
        </p>
        <p>
          <strong>Device data.</strong> A push notification token, so we can send you booking
          confirmations and updates.
        </p>
        <p>
          <strong>Service providers only.</strong> If you apply to offer services, we also collect
          your legal name, phone number, address, date of birth, bank account (IBAN) and account
          holder name for payouts, qualification documents you upload, and your salon details
          and photos.
        </p>
      </Section>

      <Section title="2. How we use your data">
        <p>We use your data to:</p>
        <ul className="list-disc space-y-1 pl-6">
          <li>create and secure your account;</li>
          <li>make, confirm and manage bookings, and notify you about them;</li>
          <li>process payments and pay service providers;</li>
          <li>verify service providers before they can accept bookings;</li>
          <li>prevent fraud and keep the platform safe;</li>
          <li>meet our legal and accounting obligations.</li>
        </ul>
        <p>
          Our legal bases are performance of our contract with you, our legitimate interest in
          running a safe marketplace, your consent (for location and notifications, which you can
          withdraw in your device settings), and legal obligations.
        </p>
        <p>We do not sell your personal data and we do not use it for third-party advertising.</p>
      </Section>

      <Section title="3. Who we share it with">
        <p>
          When you book, the salon you book with receives your name and booking details so it can
          provide the service. We also use these processors to run Kosmiks:
        </p>
        <ul className="list-disc space-y-1 pl-6">
          <li>Clerk – sign-in and account security</li>
          <li>Google – &quot;Sign in with Google&quot; and push notification delivery (Firebase)</li>
          <li>Stripe – payment processing</li>
          <li>Neon – database hosting</li>
          <li>Cloudflare – image and document storage</li>
          <li>Vercel – server hosting</li>
          <li>Resend – transactional email</li>
          <li>Expo – app updates and push notification delivery</li>
          <li>Mapbox – maps</li>
        </ul>
        <p>
          Some of these providers may process data outside the EU/EEA. Where they do, transfers are
          protected by the European Commission&apos;s Standard Contractual Clauses or an equivalent
          safeguard.
        </p>
      </Section>

      <Section title="4. How long we keep it">
        <p>
          We keep your account data while your account is active. Booking and payment records are
          kept for as long as Finnish accounting law requires (generally six years). Provider
          verification documents are deleted when they are no longer needed to verify the
          provider. When you delete your account, we delete or anonymise your remaining personal
          data.
        </p>
      </Section>

      <Section title="5. Your rights">
        <p>
          You can ask us to access, correct, delete or export your personal data, to restrict or
          object to how we process it, or withdraw consent at any time. To do so, email{" "}
          <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. You also
          have the right to complain to the Finnish Data Protection Ombudsman (tietosuoja.fi).
        </p>
      </Section>

      <Section title="6. Security">
        <p>
          Data is encrypted in transit. Provider documents are kept in private storage and are only
          viewable by our administrators through short-lived links.
        </p>
      </Section>

      <Section title="7. Children">
        <p>Kosmiks is not intended for children under 16, and service providers must be 18 or older.</p>
      </Section>

      <Section title="8. Changes">
        <p>
          If we change this policy, we will update the date above and, for significant changes,
          notify you in the app.
        </p>
      </Section>

      <Section title="9. Contact">
        <p>
          Questions about this policy or your data:{" "}
          <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </Section>
    </main>
  );
}

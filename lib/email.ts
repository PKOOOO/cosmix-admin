import nodemailer from 'nodemailer';

// Email goes through Resend's HTTP API when RESEND_API_KEY is set. Railway's
// Hobby plan blocks outbound SMTP, so the SMTP transport below only works on
// Pro (or locally). Short timeouts: a blocked SMTP port used to hang for
// nodemailer's default 2 minutes per email.
const RESEND_API_KEY = process.env.RESEND_API_KEY;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 15_000,
});

async function sendWithResend(to: string, subject: string, html: string, text: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || process.env.SMTP_FROM,
      to: [to],
      subject,
      html,
      text,
    }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Resend ${res.status}: ${json?.message ?? 'send failed'}`);
  return json.id as string;
}

// ─── Booking email templates ─────────────────────────────────────────────────
// Email clients (Gmail, Outlook) ignore <style> blocks and modern CSS, so the
// layout is tables with inline styles only.

const C = {
  brown: '#423120',
  beige: '#D7C3A7',
  sand: '#F4EDE5',
  line: '#EFE4D6',
  muted: '#8A7A6A',
  white: '#FFFFFF',
};
const SERIF = "'Philosopher', Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

type BookingEmailData = {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  saloonName: string;
  saloonAddress?: string | null;
  saloonPhone?: string | null;
  serviceName: string;
  bookingTime: string;
  bookingDate: string;
  totalAmount: number;
  notes?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatEur(amount: number) {
  return `${amount.toFixed(2).replace('.', ',')} €`;
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

/** One label/value row of the booking summary. Values are escaped here. */
function row(label: string, value: string, last = false) {
  return `
    <tr>
      <td style="padding:12px 0;${last ? '' : `border-bottom:1px solid ${C.line};`}font-family:${SANS};font-size:14px;color:${C.muted};width:38%;vertical-align:top;">${label}</td>
      <td style="padding:12px 0;${last ? '' : `border-bottom:1px solid ${C.line};`}font-family:${SANS};font-size:15px;color:${C.brown};font-weight:600;text-align:right;vertical-align:top;">${escapeHtml(value)}</td>
    </tr>`;
}

/** The shared frame: wordmark, white card, footer. */
// Served from public/; email clients need an absolute URL.
const LOGO_URL = 'https://www.kosmiks.com/email-logo.png';
const LOGO_WIDTH = 50;
const LOGO_HEIGHT = 72;

function layout({ preheader, title, intro, body, footer }: {
  preheader: string; title: string; intro: string; body: string; footer: string;
}) {
  return `<!DOCTYPE html>
<html lang="fi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(title)}</title>
  <link href="https://fonts.googleapis.com/css2?family=Philosopher:wght@700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:${C.sand};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.sand};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <tr>
            <td style="background:${C.white};border-radius:20px;padding:32px 28px;">
              <img src="${LOGO_URL}" alt="Kosmiks" width="${LOGO_WIDTH}" height="${LOGO_HEIGHT}" style="display:block;margin:0 auto 24px;border:0;outline:none;width:${LOGO_WIDTH}px;height:${LOGO_HEIGHT}px;">
              <h1 style="margin:0 0 8px;font-family:${SERIF};font-size:26px;line-height:1.25;font-weight:700;color:${C.brown};">${title}</h1>
              <p style="margin:0 0 24px;font-family:${SANS};font-size:15px;line-height:1.55;color:${C.muted};">${intro}</p>
              ${body}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 12px 0;font-family:${SANS};font-size:13px;line-height:1.6;color:${C.muted};">
              ${footer}<br>
              <a href="https://www.kosmiks.com" style="color:${C.muted};text-decoration:underline;">kosmiks.com</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function notesBlock(notes?: string) {
  if (!notes) return '';
  return `
    <div style="margin-top:20px;padding:14px 16px;background:${C.sand};border-radius:12px;font-family:${SANS};font-size:14px;line-height:1.5;color:${C.brown};">
      <span style="color:${C.muted};">Lisätiedot</span><br>${escapeHtml(notes)}
    </div>`;
}

// Email to the customer once their payment is confirmed.
export function generateUserBookingConfirmationEmail(data: BookingEmailData) {
  const { customerName, saloonName, saloonAddress, saloonPhone, serviceName, bookingTime, bookingDate, totalAmount, notes } = data;
  const name = firstName(customerName);

  const rows = [
    row('Palvelu', serviceName),
    row('Salonki', saloonName),
    ...(saloonAddress ? [row('Osoite', saloonAddress)] : []),
    row('Päivä', bookingDate),
    row('Aika', `klo ${bookingTime}`),
    row('Maksettu', formatEur(totalAmount), true),
  ].join('');

  const contact = saloonPhone
    ? `Jos haluat muuttaa tai perua varauksen, soita salonkiin: ${escapeHtml(saloonPhone)}.`
    : 'Jos haluat muuttaa tai perua varauksen, ota yhteyttä salonkiin.';

  const html = layout({
    preheader: `${serviceName}, ${bookingDate} klo ${bookingTime} – ${saloonName}`,
    title: 'Varauksesi on vahvistettu',
    intro: `Kiitos, ${escapeHtml(name)}! Odotamme sinua ${escapeHtml(saloonName)}-salongissa.`,
    body: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>${notesBlock(notes)}`,
    footer: contact,
  });

  const text = [
    `Varauksesi on vahvistettu`,
    ``,
    `Kiitos, ${name}! Odotamme sinua ${saloonName}-salongissa.`,
    ``,
    `Palvelu: ${serviceName}`,
    `Salonki: ${saloonName}`,
    ...(saloonAddress ? [`Osoite: ${saloonAddress}`] : []),
    `Päivä: ${bookingDate}`,
    `Aika: klo ${bookingTime}`,
    `Maksettu: ${formatEur(totalAmount)}`,
    ...(notes ? [``, `Lisätiedot: ${notes}`] : []),
    ``,
    saloonPhone ? `Jos haluat muuttaa tai perua varauksen, soita salonkiin: ${saloonPhone}.` : `Jos haluat muuttaa tai perua varauksen, ota yhteyttä salonkiin.`,
    ``,
    `Kosmiks – kosmiks.com`,
  ].join('\n');

  return { subject: `Varaus vahvistettu – ${saloonName}, ${bookingDate} klo ${bookingTime}`, html, text };
}

// Email to the salon owner about a new paid booking.
export function generateSalonNotificationEmail(data: BookingEmailData & { salonEmail: string }) {
  const { customerName, customerEmail, customerPhone, serviceName, bookingTime, bookingDate, totalAmount, notes } = data;

  const rows = [
    row('Asiakas', customerName),
    row('Palvelu', serviceName),
    row('Päivä', bookingDate),
    row('Aika', `klo ${bookingTime}`),
    ...(customerPhone ? [row('Puhelin', customerPhone)] : []),
    ...(customerEmail ? [row('Sähköposti', customerEmail)] : []),
    row('Maksettu verkossa', formatEur(totalAmount), true),
  ].join('');

  const html = layout({
    preheader: `${customerName} – ${serviceName}, ${bookingDate} klo ${bookingTime}`,
    title: 'Uusi varaus',
    intro: 'Asiakas on varannut ja maksanut ajan. Asiakkaalta ei peritä maksua paikan päällä.',
    body: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>${notesBlock(notes)}`,
    footer: 'Näet ja hallitset varauksia Kosmiks-sovelluksessa.',
  });

  const text = [
    `Uusi varaus`,
    ``,
    `Asiakas on varannut ja maksanut ajan. Asiakkaalta ei peritä maksua paikan päällä.`,
    ``,
    `Asiakas: ${customerName}`,
    `Palvelu: ${serviceName}`,
    `Päivä: ${bookingDate}`,
    `Aika: klo ${bookingTime}`,
    ...(customerPhone ? [`Puhelin: ${customerPhone}`] : []),
    ...(customerEmail ? [`Sähköposti: ${customerEmail}`] : []),
    `Maksettu verkossa: ${formatEur(totalAmount)}`,
    ...(notes ? [``, `Lisätiedot: ${notes}`] : []),
    ``,
    `Näet ja hallitset varauksia Kosmiks-sovelluksessa.`,
  ].join('\n');

  return { subject: `Uusi varaus: ${serviceName}, ${bookingDate} klo ${bookingTime}`, html, text };
}

// Function to send email
export async function sendEmail(to: string, subject: string, html: string, text: string) {
  try {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to: to,
      subject: subject,
      html: html,
      text: text,
    };

    if (RESEND_API_KEY) {
      const id = await sendWithResend(to, subject, html, text);
      console.log('Email sent successfully (Resend):', id);
      return { success: true, messageId: id };
    }
    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error };
  }
}

// Function to send booking confirmation to user
export async function sendBookingConfirmationToUser(bookingData: BookingEmailData) {
  const emailContent = generateUserBookingConfirmationEmail(bookingData);
  return await sendEmail(
    bookingData.customerEmail,
    emailContent.subject,
    emailContent.html,
    emailContent.text
  );
}

// Function to send booking notification to salon
export async function sendBookingNotificationToSalon(bookingData: BookingEmailData & { salonEmail: string }) {
  const emailContent = generateSalonNotificationEmail(bookingData);
  return await sendEmail(
    bookingData.salonEmail,
    emailContent.subject,
    emailContent.html,
    emailContent.text
  );
}

import nodemailer from 'nodemailer';

// Email configuration using environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// COSMIX brand colors
const BRAND_COLORS = {
  primary: '#423120',
  secondary: '#D7C3A7',
  background: '#F4EDE5',
  white: '#FFFFFF',
  text: '#333333',
  lightText: '#666666',
};

// Email template for user booking confirmation
export function generateUserBookingConfirmationEmail(bookingData: {
  customerName: string;
  customerEmail: string;
  saloonName: string;
  serviceName: string;
  bookingTime: string;
  bookingDate: string;
  totalAmount: number;
  notes?: string;
}) {
  const { customerName, saloonName, serviceName, bookingTime, bookingDate, totalAmount, notes } = bookingData;
  
  return {
    subject: `Vahvistus varauksestasi - ${saloonName}`,
    html: `
      <!DOCTYPE html>
      <html lang="fi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Varausvahvistus</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: ${BRAND_COLORS.text};
            background-color: ${BRAND_COLORS.background};
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: ${BRAND_COLORS.white};
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.secondary} 100%);
            color: ${BRAND_COLORS.white};
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
          }
          .content {
            padding: 30px;
          }
          .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: ${BRAND_COLORS.primary};
          }
          .booking-details {
            background-color: ${BRAND_COLORS.background};
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid ${BRAND_COLORS.secondary};
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .detail-label {
            font-weight: 600;
            color: ${BRAND_COLORS.primary};
          }
          .detail-value {
            color: ${BRAND_COLORS.text};
          }
          .payment-notice {
            background-color: ${BRAND_COLORS.secondary};
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
          }
          .payment-notice h3 {
            color: ${BRAND_COLORS.primary};
            margin-top: 0;
          }
          .footer {
            background-color: ${BRAND_COLORS.primary};
            color: ${BRAND_COLORS.white};
            padding: 20px;
            text-align: center;
            font-size: 14px;
          }
          .footer a {
            color: ${BRAND_COLORS.secondary};
            text-decoration: none;
          }
          .important {
            color: ${BRAND_COLORS.primary};
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>COSMIX</h1>
            <p>Varausvahvistus</p>
          </div>
          
          <div class="content">
            <div class="greeting">
              Hei ${customerName}!
            </div>
            
            <p>Kiitos varauksestasi! Varauksesi on vahvistettu ja odotamme sinua paikalle.</p>
            
            <div class="booking-details">
              <h3 style="color: ${BRAND_COLORS.primary}; margin-top: 0;">Varauksen tiedot</h3>
              <div class="detail-row">
                <span class="detail-label">Kampaamo:</span>
                <span class="detail-value">${saloonName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Palvelu:</span>
                <span class="detail-value">${serviceName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Päivämäärä:</span>
                <span class="detail-value">${bookingDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Aika:</span>
                <span class="detail-value">${bookingTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Hinta:</span>
                <span class="detail-value">${totalAmount.toFixed(2)} €</span>
              </div>
              ${notes ? `
              <div class="detail-row">
                <span class="detail-label">Huomautukset:</span>
                <span class="detail-value">${notes}</span>
              </div>
              ` : ''}
            </div>
            
            <div class="payment-notice">
              <h3>💳 Maksu paikalla</h3>
              <p><span class="important">Muista maksaa palvelu paikalla kampaamossa.</span></p>
              <p>Maksu suoritetaan käteisellä tai kortilla kampaamon vastaanotossa.</p>
            </div>
            
            <p>Jos sinulla on kysymyksiä tai tarvitset muuttaa varausta, ota yhteyttä kampaamoon suoraan.</p>
            
            <p>Nähdään pian!</p>
            <p>Ystävällisin terveisin,<br><strong>COSMIX-tiimi</strong></p>
          </div>
          
          <div class="footer">
            <p>© 2024 COSMIX. Kaikki oikeudet pidätetään.</p>
            <p>Tämä on automaattinen viesti, älä vastaa tähän sähköpostiin.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Hei ${customerName}!

Kiitos varauksestasi! Varauksesi on vahvistettu ja odotamme sinua paikalle.

VARAUKSEN TIEDOT:
- Kampaamo: ${saloonName}
- Palvelu: ${serviceName}
- Päivämäärä: ${bookingDate}
- Aika: ${bookingTime}
- Hinta: ${totalAmount.toFixed(2)} €
${notes ? `- Huomautukset: ${notes}` : ''}

💳 MAKSU PAIKALLA
Muista maksaa palvelu paikalla kampaamossa. Maksu suoritetaan käteisellä tai kortilla kampaamon vastaanotossa.

Jos sinulla on kysymyksiä tai tarvitset muuttaa varausta, ota yhteyttä kampaamoon suoraan.

Nähdään pian!
Ystävällisin terveisin,
COSMIX-tiimi

© 2024 COSMIX. Kaikki oikeudet pidätetään.
Tämä on automaattinen viesti, älä vastaa tähän sähköpostiin.
    `
  };
}

// Email template for salon notification
export function generateSalonNotificationEmail(bookingData: {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  saloonName: string;
  serviceName: string;
  bookingTime: string;
  bookingDate: string;
  totalAmount: number;
  notes?: string;
}) {
  const { customerName, customerEmail, customerPhone, saloonName, serviceName, bookingTime, bookingDate, totalAmount, notes } = bookingData;
  
  return {
    subject: `Uusi varaus - ${customerName} - ${serviceName}`,
    html: `
      <!DOCTYPE html>
      <html lang="fi">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Uusi varaus</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: ${BRAND_COLORS.text};
            background-color: ${BRAND_COLORS.background};
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: ${BRAND_COLORS.white};
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.secondary} 100%);
            color: ${BRAND_COLORS.white};
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
          }
          .content {
            padding: 30px;
          }
          .alert {
            background-color: #e8f5e8;
            border: 2px solid #4caf50;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
          }
          .alert h2 {
            color: #2e7d32;
            margin-top: 0;
          }
          .booking-details {
            background-color: ${BRAND_COLORS.background};
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid ${BRAND_COLORS.secondary};
          }
          .detail-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
          }
          .detail-row:last-child {
            border-bottom: none;
          }
          .detail-label {
            font-weight: 600;
            color: ${BRAND_COLORS.primary};
          }
          .detail-value {
            color: ${BRAND_COLORS.text};
          }
          .customer-info {
            background-color: #f0f8ff;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #2196f3;
          }
          .footer {
            background-color: ${BRAND_COLORS.primary};
            color: ${BRAND_COLORS.white};
            padding: 20px;
            text-align: center;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>COSMIX</h1>
            <p>Uusi varaus</p>
          </div>
          
          <div class="content">
            <div class="alert">
              <h2>🎉 Uusi varaus vastaanotettu!</h2>
              <p>Asiakas on tehnyt varauksen ja maksaa paikalla.</p>
            </div>
            
            <div class="customer-info">
              <h3 style="color: ${BRAND_COLORS.primary}; margin-top: 0;">Asiakkaan tiedot</h3>
              <div class="detail-row">
                <span class="detail-label">Nimi:</span>
                <span class="detail-value">${customerName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Sähköposti:</span>
                <span class="detail-value">${customerEmail}</span>
              </div>
              ${customerPhone ? `
              <div class="detail-row">
                <span class="detail-label">Puhelin:</span>
                <span class="detail-value">${customerPhone}</span>
              </div>
              ` : ''}
            </div>
            
            <div class="booking-details">
              <h3 style="color: ${BRAND_COLORS.primary}; margin-top: 0;">Varauksen tiedot</h3>
              <div class="detail-row">
                <span class="detail-label">Kampaamo:</span>
                <span class="detail-value">${saloonName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Palvelu:</span>
                <span class="detail-value">${serviceName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Päivämäärä:</span>
                <span class="detail-value">${bookingDate}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Aika:</span>
                <span class="detail-value">${bookingTime}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Hinta:</span>
                <span class="detail-value">${totalAmount.toFixed(2)} €</span>
              </div>
              ${notes ? `
              <div class="detail-row">
                <span class="detail-label">Huomautukset:</span>
                <span class="detail-value">${notes}</span>
              </div>
              ` : ''}
            </div>
            
            <p><strong>Muista:</strong> Asiakas maksaa palvelun paikalla käteisellä tai kortilla.</p>
            
            <p>Hyvää työpäivää!</p>
            <p>Ystävällisin terveisin,<br><strong>COSMIX-tiimi</strong></p>
          </div>
          
          <div class="footer">
            <p>© 2024 COSMIX. Kaikki oikeudet pidätetään.</p>
            <p>Tämä on automaattinen viesti, älä vastaa tähän sähköpostiin.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
🎉 UUSI VARAUS VASTAANOTETTU!

Asiakas on tehnyt varauksen ja maksaa paikalla.

ASIAKKAAN TIEDOT:
- Nimi: ${customerName}
- Sähköposti: ${customerEmail}
${customerPhone ? `- Puhelin: ${customerPhone}` : ''}

VARAUKSEN TIEDOT:
- Kampaamo: ${saloonName}
- Palvelu: ${serviceName}
- Päivämäärä: ${bookingDate}
- Aika: ${bookingTime}
- Hinta: ${totalAmount.toFixed(2)} €
${notes ? `- Huomautukset: ${notes}` : ''}

Muista: Asiakas maksaa palvelun paikalla käteisellä tai kortilla.

Hyvää työpäivää!
Ystävällisin terveisin,
COSMIX-tiimi

© 2024 COSMIX. Kaikki oikeudet pidätetään.
Tämä on automaattinen viesti, älä vastaa tähän sähköpostiin.
    `
  };
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

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error };
  }
}

// Function to send booking confirmation to user
export async function sendBookingConfirmationToUser(bookingData: {
  customerName: string;
  customerEmail: string;
  saloonName: string;
  serviceName: string;
  bookingTime: string;
  bookingDate: string;
  totalAmount: number;
  notes?: string;
}) {
  const emailContent = generateUserBookingConfirmationEmail(bookingData);
  return await sendEmail(
    bookingData.customerEmail,
    emailContent.subject,
    emailContent.html,
    emailContent.text
  );
}

// Function to send booking notification to salon
export async function sendBookingNotificationToSalon(bookingData: {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  saloonName: string;
  serviceName: string;
  bookingTime: string;
  bookingDate: string;
  totalAmount: number;
  notes?: string;
  salonEmail: string;
}) {
  const emailContent = generateSalonNotificationEmail(bookingData);
  return await sendEmail(
    bookingData.salonEmail,
    emailContent.subject,
    emailContent.html,
    emailContent.text
  );
}

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

/**
 * Envoie un email transactionnel via Brevo.
 * N'échoue jamais bruyamment : retourne { ok, error } pour que l'appelant
 * puisse continuer même si l'email échoue (ex : ne pas bloquer un paiement).
 */
export async function sendEmail(env, { to, toName, subject, html }) {
  if (!env.BREVO_API_KEY) {
    console.error("BREVO_API_KEY manquante : email non envoyé.", subject);
    return { ok: false, error: "Email non configuré." };
  }
  if (!env.BREVO_SENDER_EMAIL) {
    console.error("BREVO_SENDER_EMAIL manquante : email non envoyé.", subject);
    return { ok: false, error: "Expéditeur non configuré." };
  }

  try {
    const res = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": env.BREVO_API_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: {
          email: env.BREVO_SENDER_EMAIL,
          name: env.BREVO_SENDER_NAME || "Digitelio AI",
        },
        to: [{ email: to, name: toName || to }],
        subject,
        htmlContent: html,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("Brevo a refusé l'envoi", res.status, body);
      return { ok: false, error: "Échec de l'envoi de l'email." };
    }

    return { ok: true };
  } catch (err) {
    console.error("Erreur réseau lors de l'envoi Brevo", err.message);
    return { ok: false, error: err.message };
  }
}

/* ===== Gabarit : livraison d'une formation après achat ===== */
export function purchaseDeliveryEmailHtml({ buyerName, productTitle, sellerName, learnUrl }) {
  return `
  <div style="font-family: -apple-system, Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #F7F7FB;">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-weight: 700; font-size: 18px; color: #0F0F1E;">DIGITELIO <span style="color: #7C3AED;">AI</span></span>
    </div>
    <div style="background: #fff; border-radius: 20px; padding: 32px 28px; box-shadow: 0 8px 24px rgba(16,16,40,0.06);">
      <h1 style="font-size: 20px; color: #0F0F1E; margin: 0 0 12px;">Merci pour votre achat ${buyerName ? `, ${buyerName}` : ""} !</h1>
      <p style="font-size: 14px; color: #6B6B85; line-height: 1.6; margin: 0 0 20px;">
        Votre accès à <strong>${productTitle}</strong>${sellerName ? ` par ${sellerName}` : ""} est prêt.
        Cliquez sur le bouton ci-dessous pour commencer.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${learnUrl}" style="display: inline-block; background: linear-gradient(135deg,#6D3BF5,#C13BF5); color: #fff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 12px;">
          Accéder à ma formation
        </a>
      </div>
      <p style="font-size: 12px; color: #9C9CB4; text-align: center; word-break: break-all;">
        Ou copiez ce lien : ${learnUrl}
      </p>
    </div>
    <p style="text-align: center; font-size: 12px; color: #9C9CB4; margin-top: 20px;">
      Conservez cet email — ce lien est personnel et permet d'accéder à votre contenu à tout moment.
    </p>
  </div>`;
}

/* ===== Gabarit : certificat de réussite disponible ===== */
export function certificateReadyEmailHtml({ learnerName, formationTitle, instructorName, learnUrl }) {
  return `
  <div style="font-family: -apple-system, Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #F7F7FB;">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-weight: 700; font-size: 18px; color: #0F0F1E;">DIGITELIO <span style="color: #7C3AED;">AI</span></span>
    </div>
    <div style="background: #fff; border-radius: 20px; padding: 32px 28px; box-shadow: 0 8px 24px rgba(16,16,40,0.06);">
      <h1 style="font-size: 20px; color: #0F0F1E; margin: 0 0 12px;">🎉 Félicitations${learnerName ? `, ${learnerName}` : ""} !</h1>
      <p style="font-size: 14px; color: #6B6B85; line-height: 1.6; margin: 0 0 20px;">
        Vous avez terminé avec succès <strong>${formationTitle}</strong>${instructorName ? ` par ${instructorName}` : ""}.
        Votre certificat de réussite est prêt.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${learnUrl}" style="display: inline-block; background: linear-gradient(135deg,#6D3BF5,#C13BF5); color: #fff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 12px;">
          Télécharger mon certificat
        </a>
      </div>
      <p style="font-size: 12px; color: #9C9CB4; text-align: center; word-break: break-all;">
        Ou copiez ce lien : ${learnUrl}
      </p>
    </div>
    <p style="text-align: center; font-size: 12px; color: #9C9CB4; margin-top: 20px;">
      Sur cette page, le bouton « Télécharger mon certificat » ouvre l'impression PDF.
    </p>
  </div>`;
}

/* ===== Gabarit : livraison d'un eBook après achat ===== */
export function ebookDeliveryEmailHtml({ buyerName, productTitle, sellerName, readUrl }) {
  return `
  <div style="font-family: -apple-system, Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #F7F7FB;">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-weight: 700; font-size: 18px; color: #0F0F1E;">DIGITELIO <span style="color: #7C3AED;">AI</span></span>
    </div>
    <div style="background: #fff; border-radius: 20px; padding: 32px 28px; box-shadow: 0 8px 24px rgba(16,16,40,0.06);">
      <h1 style="font-size: 20px; color: #0F0F1E; margin: 0 0 12px;">Merci pour votre achat ${buyerName ? `, ${buyerName}` : ""} !</h1>
      <p style="font-size: 14px; color: #6B6B85; line-height: 1.6; margin: 0 0 20px;">
        Votre eBook <strong>${productTitle}</strong>${sellerName ? ` par ${sellerName}` : ""} est prêt.
        Cliquez sur le bouton ci-dessous pour le lire et le télécharger en PDF.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${readUrl}" style="display: inline-block; background: linear-gradient(135deg,#6D3BF5,#C13BF5); color: #fff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 12px;">
          Lire mon eBook
        </a>
      </div>
      <p style="font-size: 12px; color: #9C9CB4; text-align: center; word-break: break-all;">
        Ou copiez ce lien : ${readUrl}
      </p>
    </div>
    <p style="text-align: center; font-size: 12px; color: #9C9CB4; margin-top: 20px;">
      Conservez cet email — ce lien est personnel et permet d'accéder à votre eBook et de le télécharger en PDF à tout moment.
    </p>
  </div>`;
}

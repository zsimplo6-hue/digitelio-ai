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

/* ===== Textes des emails, par langue ===== */
const TXT = {
  fr: {
    buyThanks: (n) => `Merci pour votre achat${n ? `, ${n}` : ""} !`,
    courseBody: (t, s) => `Votre accès à <strong>${t}</strong>${s ? ` par ${s}` : ""} est prêt. Cliquez sur le bouton ci-dessous pour commencer.`,
    courseBtn: "Accéder à ma formation",
    ebookBody: (t, s) => `Votre eBook <strong>${t}</strong>${s ? ` par ${s}` : ""} est prêt. Cliquez sur le bouton ci-dessous pour le lire et le télécharger en PDF.`,
    ebookBtn: "Lire mon eBook",
    copy: "Ou copiez ce lien :",
    keepCourse: "Conservez cet email — ce lien est personnel et permet d'accéder à votre contenu à tout moment.",
    keepEbook: "Conservez cet email — ce lien est personnel et permet d'accéder à votre eBook et de le télécharger en PDF à tout moment.",
    congrats: (n) => `🎉 Félicitations${n ? `, ${n}` : ""} !`,
    certBody: (t, i) => `Vous avez terminé avec succès <strong>${t}</strong>${i ? ` par ${i}` : ""}. Votre certificat de réussite est prêt.`,
    certBtn: "Télécharger mon certificat",
    certHint: "Sur cette page, le bouton « Télécharger mon certificat » ouvre l'impression PDF.",
  },
  en: {
    buyThanks: (n) => `Thank you for your purchase${n ? `, ${n}` : ""}!`,
    courseBody: (t, s) => `Your access to <strong>${t}</strong>${s ? ` by ${s}` : ""} is ready. Click the button below to get started.`,
    courseBtn: "Access my course",
    ebookBody: (t, s) => `Your eBook <strong>${t}</strong>${s ? ` by ${s}` : ""} is ready. Click the button below to read it and download it as a PDF.`,
    ebookBtn: "Read my eBook",
    copy: "Or copy this link:",
    keepCourse: "Keep this email — this link is personal and gives you access to your content at any time.",
    keepEbook: "Keep this email — this link is personal and lets you read your eBook and download it as a PDF at any time.",
    congrats: (n) => `🎉 Congratulations${n ? `, ${n}` : ""}!`,
    certBody: (t, i) => `You have successfully completed <strong>${t}</strong>${i ? ` by ${i}` : ""}. Your certificate of completion is ready.`,
    certBtn: "Download my certificate",
    certHint: "On this page, the “Download my certificate” button opens the PDF print dialog.",
  },
  es: {
    buyThanks: (n) => `¡Gracias por tu compra${n ? `, ${n}` : ""}!`,
    courseBody: (t, s) => `Tu acceso a <strong>${t}</strong>${s ? ` de ${s}` : ""} está listo. Haz clic en el botón de abajo para empezar.`,
    courseBtn: "Acceder a mi curso",
    ebookBody: (t, s) => `Tu eBook <strong>${t}</strong>${s ? ` de ${s}` : ""} está listo. Haz clic en el botón de abajo para leerlo y descargarlo en PDF.`,
    ebookBtn: "Leer mi eBook",
    copy: "O copia este enlace:",
    keepCourse: "Conserva este correo: este enlace es personal y te da acceso a tu contenido en cualquier momento.",
    keepEbook: "Conserva este correo: este enlace es personal y te permite leer tu eBook y descargarlo en PDF en cualquier momento.",
    congrats: (n) => `🎉 ¡Felicidades${n ? `, ${n}` : ""}!`,
    certBody: (t, i) => `Has completado con éxito <strong>${t}</strong>${i ? ` de ${i}` : ""}. Tu certificado de finalización está listo.`,
    certBtn: "Descargar mi certificado",
    certHint: "En esta página, el botón «Descargar mi certificado» abre la impresión en PDF.",
  },
  pt: {
    buyThanks: (n) => `Obrigado pela sua compra${n ? `, ${n}` : ""}!`,
    courseBody: (t, s) => `O seu acesso a <strong>${t}</strong>${s ? ` de ${s}` : ""} está pronto. Clique no botão abaixo para começar.`,
    courseBtn: "Aceder ao meu curso",
    ebookBody: (t, s) => `O seu eBook <strong>${t}</strong>${s ? ` de ${s}` : ""} está pronto. Clique no botão abaixo para o ler e descarregar em PDF.`,
    ebookBtn: "Ler o meu eBook",
    copy: "Ou copie este link:",
    keepCourse: "Guarde este email — este link é pessoal e permite aceder ao seu conteúdo a qualquer momento.",
    keepEbook: "Guarde este email — este link é pessoal e permite ler o seu eBook e descarregá-lo em PDF a qualquer momento.",
    congrats: (n) => `🎉 Parabéns${n ? `, ${n}` : ""}!`,
    certBody: (t, i) => `Concluiu com sucesso <strong>${t}</strong>${i ? ` de ${i}` : ""}. O seu certificado de conclusão está pronto.`,
    certBtn: "Baixar o meu certificado",
    certHint: "Nesta página, o botão «Baixar o meu certificado» abre a impressão em PDF.",
  },
  de: {
    buyThanks: (n) => `Vielen Dank für Ihren Kauf${n ? `, ${n}` : ""}!`,
    courseBody: (t, s) => `Ihr Zugang zu <strong>${t}</strong>${s ? ` von ${s}` : ""} ist bereit. Klicken Sie auf die Schaltfläche unten, um zu beginnen.`,
    courseBtn: "Zu meinem Kurs",
    ebookBody: (t, s) => `Ihr eBook <strong>${t}</strong>${s ? ` von ${s}` : ""} ist bereit. Klicken Sie auf die Schaltfläche unten, um es zu lesen und als PDF herunterzuladen.`,
    ebookBtn: "Mein eBook lesen",
    copy: "Oder kopieren Sie diesen Link:",
    keepCourse: "Bewahren Sie diese E-Mail auf – dieser Link ist persönlich und gibt Ihnen jederzeit Zugriff auf Ihre Inhalte.",
    keepEbook: "Bewahren Sie diese E-Mail auf – mit diesem persönlichen Link können Sie Ihr eBook jederzeit lesen und als PDF herunterladen.",
    congrats: (n) => `🎉 Herzlichen Glückwunsch${n ? `, ${n}` : ""}!`,
    certBody: (t, i) => `Sie haben <strong>${t}</strong>${i ? ` von ${i}` : ""} erfolgreich abgeschlossen. Ihr Zertifikat ist bereit.`,
    certBtn: "Mein Zertifikat herunterladen",
    certHint: "Auf dieser Seite öffnet die Schaltfläche „Mein Zertifikat herunterladen“ den PDF-Druck.",
  },
  it: {
    buyThanks: (n) => `Grazie per il tuo acquisto${n ? `, ${n}` : ""}!`,
    courseBody: (t, s) => `Il tuo accesso a <strong>${t}</strong>${s ? ` di ${s}` : ""} è pronto. Clicca sul pulsante qui sotto per iniziare.`,
    courseBtn: "Accedi al mio corso",
    ebookBody: (t, s) => `Il tuo eBook <strong>${t}</strong>${s ? ` di ${s}` : ""} è pronto. Clicca sul pulsante qui sotto per leggerlo e scaricarlo in PDF.`,
    ebookBtn: "Leggi il mio eBook",
    copy: "Oppure copia questo link:",
    keepCourse: "Conserva questa email: il link è personale e ti permette di accedere ai contenuti in qualsiasi momento.",
    keepEbook: "Conserva questa email: il link è personale e ti permette di leggere il tuo eBook e scaricarlo in PDF in qualsiasi momento.",
    congrats: (n) => `🎉 Complimenti${n ? `, ${n}` : ""}!`,
    certBody: (t, i) => `Hai completato con successo <strong>${t}</strong>${i ? ` di ${i}` : ""}. Il tuo certificato è pronto.`,
    certBtn: "Scarica il mio certificato",
    certHint: "In questa pagina, il pulsante «Scarica il mio certificato» apre la stampa in PDF.",
  },
  ar: {
    buyThanks: (n) => `شكرًا على شرائك${n ? `، ${n}` : ""}!`,
    courseBody: (t, s) => `تم تجهيز وصولك إلى <strong>${t}</strong>${s ? ` من ${s}` : ""}. اضغط على الزر أدناه للبدء.`,
    courseBtn: "الدخول إلى دورتي",
    ebookBody: (t, s) => `كتابك الإلكتروني <strong>${t}</strong>${s ? ` من ${s}` : ""} جاهز. اضغط على الزر أدناه لقراءته وتنزيله بصيغة PDF.`,
    ebookBtn: "قراءة كتابي",
    copy: "أو انسخ هذا الرابط:",
    keepCourse: "احتفظ بهذه الرسالة — هذا الرابط شخصي ويتيح لك الوصول إلى المحتوى في أي وقت.",
    keepEbook: "احتفظ بهذه الرسالة — هذا الرابط شخصي ويتيح لك قراءة كتابك وتنزيله بصيغة PDF في أي وقت.",
    congrats: (n) => `🎉 تهانينا${n ? `، ${n}` : ""}!`,
    certBody: (t, i) => `لقد أنهيت بنجاح <strong>${t}</strong>${i ? ` من ${i}` : ""}. شهادة الإتمام الخاصة بك جاهزة.`,
    certBtn: "تنزيل شهادتي",
    certHint: "في هذه الصفحة، يفتح زر «تنزيل شهادتي» نافذة الطباعة بصيغة PDF.",
  },
};

const tx = (language) => TXT[language] || TXT.fr;

/* Les noms et titres viennent des utilisateurs : on les protège avant de les mettre dans le HTML */
const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/* Gabarit commun */
function layout({ language, title, bodyHtml, buttonLabel, url, copyLabel, footer }) {
  const rtl = language === "ar";
  return `
  <div dir="${rtl ? "rtl" : "ltr"}" style="font-family: -apple-system, Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #F7F7FB;">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-weight: 700; font-size: 18px; color: #0F0F1E;">DIGITELIO <span style="color: #7C3AED;">AI</span></span>
    </div>
    <div style="background: #fff; border-radius: 20px; padding: 32px 28px; box-shadow: 0 8px 24px rgba(16,16,40,0.06);">
      <h1 style="font-size: 20px; color: #0F0F1E; margin: 0 0 12px;">${title}</h1>
      <p style="font-size: 14px; color: #6B6B85; line-height: 1.6; margin: 0 0 20px;">${bodyHtml}</p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${esc(url)}" style="display: inline-block; background: linear-gradient(135deg,#6D3BF5,#C13BF5); color: #fff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 12px;">
          ${buttonLabel}
        </a>
      </div>
      <p style="font-size: 12px; color: #9C9CB4; text-align: center; word-break: break-all;">
        ${copyLabel} ${esc(url)}
      </p>
    </div>
    <p style="text-align: center; font-size: 12px; color: #9C9CB4; margin-top: 20px;">${footer}</p>
  </div>`;
}

/* ===== Gabarit : livraison d'une formation après achat ===== */
export function purchaseDeliveryEmailHtml({ buyerName, productTitle, sellerName, learnUrl, language = "fr" }) {
  const T = tx(language);
  return layout({
    language,
    title: T.buyThanks(esc(buyerName)),
    bodyHtml: T.courseBody(esc(productTitle), esc(sellerName)),
    buttonLabel: T.courseBtn,
    url: learnUrl,
    copyLabel: T.copy,
    footer: T.keepCourse,
  });
}

/* ===== Gabarit : certificat de réussite disponible ===== */
export function certificateReadyEmailHtml({ learnerName, formationTitle, instructorName, learnUrl, language = "fr" }) {
  const T = tx(language);
  return layout({
    language,
    title: T.congrats(esc(learnerName)),
    bodyHtml: T.certBody(esc(formationTitle), esc(instructorName)),
    buttonLabel: T.certBtn,
    url: learnUrl,
    copyLabel: T.copy,
    footer: T.certHint,
  });
}

/* ===== Gabarit : livraison d'un eBook après achat ===== */
export function ebookDeliveryEmailHtml({ buyerName, productTitle, sellerName, readUrl, language = "fr" }) {
  const T = tx(language);
  return layout({
    language,
    title: T.buyThanks(esc(buyerName)),
    bodyHtml: T.ebookBody(esc(productTitle), esc(sellerName)),
    buttonLabel: T.ebookBtn,
    url: readUrl,
    copyLabel: T.copy,
    footer: T.keepEbook,
  });
    }

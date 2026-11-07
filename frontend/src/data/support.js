/* Contenu partagé : FAQ, centre d'aide, contact. Modifiez ici pour mettre à jour toutes les pages. */
export const SUPPORT_EMAIL = "zsimplo6@gmail.com";
export const LEGAL_UPDATED = "7 novembre 2026";

export const mailTo = (subject = "Support Digitelio AI") =>
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;

export const FAQ_CATEGORIES = [
  {
    id: "demarrer",
    icon: "🚀",
    title: "Démarrer",
    desc: "Comprendre Digitelio AI et créer votre premier produit.",
    items: [
      {
        q: "Qu'est-ce que Digitelio AI ?",
        a: "Digitelio AI est une plateforme qui utilise l'intelligence artificielle pour créer des produits digitaux : eBooks et formations en ligne, exportés en PDF au rendu professionnel, plus des textes marketing pour les présenter et les vendre.",
      },
      {
        q: "Ai-je besoin de compétences techniques ?",
        a: "Non. Vous choisissez un sujet, un ton et une langue, l'IA propose un plan que vous pouvez modifier, puis rédige le contenu. Aucune compétence en design ou en informatique n'est nécessaire.",
      },
      {
        q: "Comment créer mon premier eBook ?",
        a: "Depuis le tableau de bord, cliquez sur « Créer un eBook », décrivez votre sujet, choisissez la longueur et le modèle de mise en page, puis lancez la génération. Vous pouvez ensuite relire, modifier et exporter le livre en PDF.",
      },
      {
        q: "Comment créer une formation ?",
        a: "Ouvrez « Formations », renseignez le sujet, le public et le ton. L'IA génère un plan en modules que vous pouvez réorganiser et corriger. Une fois le plan validé, vous générez les leçons, ajoutez des images ou des vidéos, puis exportez la formation complète en PDF.",
      },
      {
        q: "Puis-je modifier ce que l'IA a généré ?",
        a: "Oui, tout est modifiable : le plan, chaque leçon, les titres, les images. Nous vous conseillons toujours de relire le contenu avant de le diffuser.",
      },
      {
        q: "Dans quelles langues puis-je créer mes produits ?",
        a: "Le plan Gratuit génère en français. Les plans Pro et Business ajoutent l'anglais, l'espagnol, le portugais, l'allemand, l'italien et l'arabe. La qualité est un peu moins régulière en arabe : relisez bien le texte avant de le diffuser.",
      },
    ],
  },
  {
    id: "abonnement",
    icon: "💎",
    title: "Abonnement et paiement",
    desc: "Plans, tarifs, durée, renouvellement et paiement.",
    items: [
      {
        q: "Quels sont les plans et les tarifs ?",
        a: "Trois plans : Gratuit (pour découvrir), Pro à 5 000 FCFA par mois et Business à 13 000 FCFA par mois. Les plans payants augmentent les quotas de création, débloquent les 12 modèles (6 pour les eBooks, 6 pour les formations), toutes les langues, les idées de produits et les certificats.",
      },
      {
        q: "Comment fonctionne l'abonnement ?",
        a: "Votre abonnement démarre à l'instant de votre paiement et dure 30 jours, à la seconde près. À l'échéance, il expire : vous le renouvelez pour continuer, sans engagement. Il n'y a pas de prélèvement automatique.",
      },
      {
        q: "Mon plan est-il activé automatiquement après le paiement ?",
        a: "Oui. Dès que le paiement est confirmé par notre prestataire de paiement, votre plan s'active automatiquement, sans action de votre part. Si vous venez de payer, patientez une à deux minutes puis rechargez la page.",
      },
      {
        q: "J'ai payé mais mon plan n'est pas activé. Que faire ?",
        a: "Rechargez d'abord la page Abonnements après quelques minutes. Si rien ne change, écrivez-nous à l'adresse du support avec l'email de votre compte, le plan choisi, le montant et, si possible, une capture d'écran de la confirmation de paiement. Nous vérifions et activons votre plan rapidement.",
      },
      {
        q: "Puis-je payer dans ma monnaie ?",
        a: "Le prix est fixé en FCFA. Selon votre moyen de paiement, votre prestataire peut convertir le montant dans votre monnaie. Les paiements effectués dans une autre devise sont acceptés.",
      },
      {
        q: "Que se passe-t-il à la fin de mon abonnement ?",
        a: "Votre compte repasse au plan Gratuit. Vos eBooks et formations sont toujours conservés et consultables ; seules les fonctionnalités et quotas des plans payants sont suspendus jusqu'au renouvellement.",
      },
      {
        q: "Puis-je passer du plan Pro au plan Business ?",
        a: "Oui, depuis la page Abonnements, vous pouvez choisir un plan supérieur à tout moment.",
      },
    ],
  },
  {
    id: "ebooks",
    icon: "📘",
    title: "eBooks",
    desc: "Création, modèles, couverture et export PDF.",
    items: [
      {
        q: "Combien d'eBooks puis-je créer ?",
        a: "Cela dépend de votre plan : 1 eBook en Gratuit, 10 en Pro et 50 en Business. Les quotas sont indiqués sur la page Abonnements.",
      },
      {
        q: "Comment changer le modèle de mise en page d'un eBook ?",
        a: "Ouvrez l'eBook, puis choisissez « Modèle du livre ». Vous pouvez comparer les modèles dans la page « Modèles » du menu. Le plan Gratuit inclut 1 modèle, les plans payants les débloquent tous.",
      },
      {
        q: "Comment télécharger mon eBook en PDF ?",
        a: "Ouvrez l'eBook puis utilisez le bouton d'export PDF. Dans la fenêtre d'impression, choisissez « Enregistrer au format PDF » comme destination.",
      },
      {
        q: "Puis-je personnaliser les couleurs et mon nom d'auteur ?",
        a: "Oui, dans « Mon style » vous définissez votre nom, votre slogan et vos couleurs, appliqués à vos couvertures et documents.",
      },
    ],
  },
  {
    id: "formations",
    icon: "🎓",
    title: "Formations",
    desc: "Plan, leçons, images, vidéos et PDF.",
    items: [
      {
        q: "Comment fonctionne la génération d'une formation ?",
        a: "En trois temps : l'IA propose un plan de modules, vous le modifiez à votre goût, puis vous générez les leçons. Vous pouvez régénérer un module précis sans toucher aux autres.",
      },
      {
        q: "Puis-je ajouter des images et des vidéos ?",
        a: "Oui. Vous pouvez ajouter des images à chaque module et des liens YouTube ou Vimeo. Dans l'export PDF, une vidéo apparaît sous forme de carte avec son lien.",
      },
      {
        q: "Pourquoi mes anciennes leçons n'ont-elles pas de « À retenir » et de « Résumé » ?",
        a: "Ces encadrés sont ajoutés à la génération. Pour les obtenir sur une leçon existante, régénérez-la. Pensez à copier vos modifications importantes avant de régénérer.",
      },
      {
        q: "Comment obtenir le PDF de ma formation ?",
        a: "Depuis la formation, utilisez l'export PDF : couverture, sommaire, modules numérotés et conclusion sont inclus, dans le modèle que vous avez choisi.",
      },
      {
        q: "Qu'est-ce que le certificat ?",
        a: "Un certificat de fin de formation personnalisable, disponible avec les plans Pro et Business.",
      },
    ],
  },
  {
    id: "compte",
    icon: "🔐",
    title: "Compte et sécurité",
    desc: "Connexion, mot de passe et données personnelles.",
    items: [
      {
        q: "J'ai oublié mon mot de passe.",
        a: "Sur la page de connexion, cliquez sur « Mot de passe oublié », saisissez votre email et suivez le lien reçu. Pensez à vérifier vos courriers indésirables.",
      },
      {
        q: "Comment modifier mon nom ou mon email ?",
        a: "Rendez-vous dans « Paramètres » depuis le menu de votre tableau de bord.",
      },
      {
        q: "Mes contenus sont-ils privés ?",
        a: "Oui. Vos eBooks et formations ne sont visibles que de vous, sauf si vous choisissez de les partager vous-même. Consultez notre politique de confidentialité pour le détail.",
      },
      {
        q: "Comment supprimer mon compte ?",
        a: "Envoyez-nous une demande depuis l'email de votre compte à l'adresse du support. Nous supprimons votre compte et vos contenus.",
      },
    ],
  },
  {
    id: "problemes",
    icon: "🛠️",
    title: "Problèmes courants",
    desc: "Solutions rapides aux soucis les plus fréquents.",
    items: [
      {
        q: "La génération est lente ou s'arrête.",
        a: "Les contenus longs demandent quelques minutes. Gardez la page ouverte, vérifiez votre connexion et réessayez. Si le problème persiste, relancez la génération du module concerné.",
      },
      {
        q: "J'ai atteint la limite de mon plan.",
        a: "La page Abonnements affiche votre utilisation. Vous pouvez passer à un plan supérieur ou attendre le renouvellement mensuel des quotas.",
      },
      {
        q: "L'affichage est cassé sur mon téléphone.",
        a: "Actualisez la page et videz le cache du navigateur. Si le défaut reste, envoyez-nous une capture d'écran avec le nom de votre téléphone et de votre navigateur.",
      },
      {
        q: "Le PDF exporté est coupé ou mal paginé.",
        a: "Dans la fenêtre d'impression, mettez les marges sur « Aucune » ou « Par défaut », activez « Graphiques d'arrière-plan » et choisissez le format A4.",
      },
    ],
  },
];

export const ALL_FAQ = FAQ_CATEGORIES.flatMap((c) =>
  c.items.map((it) => ({ ...it, cat: c.id, catTitle: c.title }))
);
        

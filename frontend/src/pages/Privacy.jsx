import { LegalDoc } from "./LegalDoc.jsx";
import { SUPPORT_EMAIL } from "../data/support.js";

const sections = [
  {
    id: "intro",
    title: "Notre engagement",
    body: [
      "Cette politique explique quelles données Digitelio AI collecte, pourquoi, comment elles sont protégées et quels sont vos droits. Nous ne vendons pas vos données personnelles.",
    ],
  },
  {
    id: "donnees",
    title: "Données collectées",
    body: [
      "Nous collectons uniquement ce qui est nécessaire au fonctionnement du Service :",
      [
        "compte : nom, adresse email, mot de passe (stocké sous forme chiffrée irréversible) ;",
        "contenus : eBooks, formations, plans, textes, images et réglages de style que vous créez ou importez ;",
        "abonnement et paiement : plan choisi, dates, montant et statut du paiement (nous ne voyons ni n'enregistrons vos numéros de carte ou de compte) ;",
        "usage : quotas consommés, date d'inscription, événements techniques utiles à la sécurité et au dépannage ;",
        "échanges avec le support : les messages que vous nous envoyez.",
      ],
    ],
  },
  {
    id: "usage",
    title: "Utilisation des données",
    body: [
      "Vos données servent à : fournir et sécuriser le Service, générer vos contenus, gérer votre abonnement et vos paiements, vous envoyer les emails indispensables (réinitialisation de mot de passe, confirmations), répondre au support et améliorer la qualité du Service.",
    ],
  },
  {
    id: "ia",
    title: "Intelligence artificielle",
    body: [
      "Pour générer vos contenus, les instructions que vous saisissez (sujet, ton, plan, texte à retravailler) sont transmises à un fournisseur de modèles d'IA qui renvoie le texte généré. Évitez d'y saisir des informations confidentielles ou sensibles que vous ne souhaitez pas traiter par un service tiers.",
    ],
  },
  {
    id: "partage",
    title: "Partage avec des tiers",
    body: [
      "Nous ne partageons vos données qu'avec des prestataires nécessaires au Service, dans la mesure requise : hébergement et infrastructure, fournisseur d'IA, prestataire de paiement, service d'envoi d'emails.",
      "Nous pouvons aussi divulguer des données si la loi l'exige ou pour protéger nos droits et la sécurité des utilisateurs.",
      "Vos contenus ne sont visibles que de vous, sauf si vous décidez de les partager ou de les publier.",
    ],
  },
  {
    id: "cookies",
    title: "Cookies et stockage local",
    body: [
      "Nous utilisons un cookie de session strictement nécessaire pour vous maintenir connecté, et le stockage local de votre navigateur pour retenir des préférences (par exemple le thème clair ou sombre). Ces éléments ne servent pas à de la publicité.",
    ],
  },
  {
    id: "conservation",
    title: "Conservation et sécurité",
    body: [
      "Vos données sont conservées tant que votre compte est actif, puis supprimées sur demande, sauf obligation légale de conservation (par exemple pour les justificatifs de paiement).",
      "Nous appliquons des mesures raisonnables de sécurité : connexions chiffrées (HTTPS), mots de passe chiffrés, accès restreints. Aucun système n'étant infaillible, nous ne pouvons garantir une sécurité absolue.",
    ],
  },
  {
    id: "droits",
    title: "Vos droits",
    body: [
      "Vous pouvez demander l'accès à vos données, leur correction, leur export ou la suppression de votre compte, et vous opposer à certains traitements. Écrivez-nous depuis l'email de votre compte ; nous répondons dans un délai raisonnable.",
    ],
  },
  {
    id: "mineurs",
    title: "Mineurs",
    body: ["Le Service s'adresse aux personnes ayant la capacité de contracter. Il n'est pas destiné aux enfants."],
  },
  {
    id: "changements",
    title: "Modifications de cette politique",
    body: ["Nous pouvons mettre à jour cette politique. La date de dernière mise à jour figure en haut de la page ; en cas de changement important, nous vous en informerons."],
  },
  {
    id: "contact",
    title: "Contact",
    body: [`Pour toute question sur vos données ou pour exercer vos droits : ${SUPPORT_EMAIL}.`],
  },
];

export default function Privacy() {
  return (
    <LegalDoc
      kicker="Informations légales"
      title="Politique de confidentialité"
      subtitle="Vos données restent les vôtres. Voici comment nous les traitons, en toute transparence."
      sections={sections}
    />
  );
  }

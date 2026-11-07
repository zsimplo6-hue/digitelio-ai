import { LegalDoc } from "./LegalDoc.jsx";
import { SUPPORT_EMAIL } from "../data/support.js";

const sections = [
  {
    id: "objet",
    title: "Objet et acceptation",
    body: [
      "Les présentes conditions d'utilisation (« Conditions ») encadrent l'accès et l'usage de Digitelio AI (le « Service »), une plateforme de création de produits digitaux (eBooks, formations, contenus marketing) assistée par intelligence artificielle, éditée par Digitelio AI (l'« Éditeur »).",
      "En créant un compte ou en utilisant le Service, vous acceptez ces Conditions. Si vous ne les acceptez pas, n'utilisez pas le Service.",
    ],
  },
  {
    id: "compte",
    title: "Création et sécurité du compte",
    body: [
      "Vous devez fournir des informations exactes et une adresse email valide. Vous êtes responsable de la confidentialité de votre mot de passe et de toute activité réalisée depuis votre compte.",
      "Un compte est personnel. Prévenez-nous sans délai en cas d'usage non autorisé.",
      "Vous devez avoir la capacité légale de contracter dans votre pays de résidence.",
    ],
  },
  {
    id: "service",
    title: "Description du Service",
    body: [
      "Le Service permet de générer des plans, des chapitres et des leçons, de les modifier, de les mettre en forme avec des modèles, d'ajouter des images et des vidéos, de les exporter en PDF et de générer des textes marketing.",
      "Nous faisons évoluer le Service en continu : fonctionnalités, modèles et limites peuvent être ajoutés, modifiés ou retirés. Nous nous efforçons d'assurer une bonne disponibilité mais ne garantissons pas un fonctionnement ininterrompu.",
    ],
  },
  {
    id: "plans",
    title: "Plans, tarifs et durée",
    body: [
      "Le Service propose un plan Gratuit et des plans payants (Pro et Business). Les tarifs, quotas et fonctionnalités de chaque plan sont affichés sur la page d'accueil et dans la page Abonnements.",
      "Un abonnement payant démarre à l'instant où le paiement est confirmé et dure 30 jours. Il n'est pas renouvelé automatiquement : à l'échéance, le compte repasse au plan Gratuit tant qu'un nouveau paiement n'a pas été effectué.",
      "Les tarifs sont exprimés en FCFA. Selon votre moyen de paiement, votre prestataire peut convertir le montant dans votre monnaie. Nous pouvons modifier nos tarifs ; la modification ne s'applique pas à une période déjà payée.",
    ],
  },
  {
    id: "paiement",
    title: "Paiement et remboursement",
    body: [
      "Les paiements sont traités en ligne par un prestataire de paiement tiers. Nous n'enregistrons pas vos données de carte ou de compte de paiement.",
      "Le plan est activé automatiquement une fois le paiement confirmé. Si l'activation n'a pas lieu, contactez le support avec les détails du paiement : nous la vérifions et l'effectuons.",
      "Les périodes d'abonnement entamées ne sont en principe pas remboursables. Un remboursement ou un report peut être accordé en cas de double paiement, d'erreur de facturation ou d'impossibilité durable d'utiliser le Service de notre fait, sur demande au support.",
    ],
  },
  {
    id: "usage",
    title: "Usage acceptable",
    body: [
      "Vous vous engagez à utiliser le Service de façon licite et à ne pas :",
      [
        "générer ou diffuser des contenus illégaux, haineux, diffamatoires, trompeurs, pornographiques ou portant atteinte aux mineurs ;",
        "violer les droits de tiers (droit d'auteur, marques, vie privée) ;",
        "tenter de contourner les quotas, la sécurité ou les mécanismes de paiement ;",
        "perturber le Service, l'automatiser abusivement ou en extraire les données de manière massive ;",
        "partager ou revendre l'accès à votre compte.",
      ],
      "Nous pouvons suspendre ou supprimer un compte qui enfreint ces règles, sans remboursement, après avertissement lorsque c'est possible.",
    ],
  },
  {
    id: "contenus",
    title: "Vos contenus et propriété intellectuelle",
    body: [
      "Vous conservez la propriété des contenus que vous créez avec le Service (textes, images importées, plans). Vous nous accordez uniquement le droit technique de les stocker, les traiter et les afficher pour vous fournir le Service.",
      "Vous êtes seul responsable de l'usage, de la diffusion et de la vente de vos produits, ainsi que de leur conformité à la loi et aux droits de tiers. Les images et vidéos que vous ajoutez doivent être libres de droits ou vous appartenir.",
      "La marque, le logo, les modèles de mise en page et le code de Digitelio AI restent la propriété de l'Éditeur. Les modèles sont mis à votre disposition pour mettre en forme vos propres produits.",
    ],
  },
  {
    id: "ia",
    title: "Contenus générés par l'IA",
    body: [
      "Les textes sont générés par des modèles d'intelligence artificielle. Ils peuvent contenir des erreurs, des approximations ou des informations dépassées, et deux générations peuvent différer.",
      "Vous devez relire, vérifier et corriger les contenus avant toute diffusion. Le Service ne fournit aucun conseil juridique, médical, financier ou professionnel, et nous ne garantissons ni l'exactitude ni l'originalité des contenus générés.",
    ],
  },
  {
    id: "responsabilite",
    title: "Responsabilité",
    body: [
      "Le Service est fourni « en l'état ». Dans les limites permises par la loi, l'Éditeur n'est pas responsable des dommages indirects (perte de revenus, de clientèle ou de données) liés à l'usage du Service, ni des contenus que vous publiez.",
      "Notre responsabilité totale, pour tout fait lié au Service, est limitée aux sommes que vous avez payées au cours des 3 mois précédant l'événement. Ces limites ne s'appliquent pas lorsque la loi l'interdit.",
      "Nous vous conseillons de conserver une copie de vos contenus importants (export PDF).",
    ],
  },
  {
    id: "resiliation",
    title: "Résiliation",
    body: [
      "Vous pouvez cesser d'utiliser le Service à tout moment et demander la suppression de votre compte en écrivant au support depuis l'email de votre compte.",
      "À la fin d'un abonnement payant, vos contenus sont conservés mais les fonctionnalités et quotas des plans payants sont suspendus. Nous pouvons suspendre ou fermer un compte en cas de violation des Conditions ou d'usage frauduleux.",
    ],
  },
  {
    id: "modifications",
    title: "Modification des Conditions",
    body: [
      "Nous pouvons mettre à jour ces Conditions. La date de dernière mise à jour figure en haut de cette page. En cas de changement important, nous vous en informerons par le Service ou par email. L'usage du Service après la mise à jour vaut acceptation.",
    ],
  },
  {
    id: "contact",
    title: "Contact",
    body: [`Pour toute question ou réclamation : ${SUPPORT_EMAIL}.`],
  },
];

export default function Terms() {
  return (
    <LegalDoc
      kicker="Informations légales"
      title="Conditions d'utilisation"
      subtitle="Les règles simples et transparentes qui encadrent l'usage de Digitelio AI."
      sections={sections}
    />
  );
}

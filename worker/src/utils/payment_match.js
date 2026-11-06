/* Contrôle de cohérence d'un paiement SasPay réussi, quelle que soit la devise.
   - le paiement doit appartenir à notre session (metadata.payment_id / sale_id, si SasPay le renvoie) ;
   - en franc CFA (XOF/XAF, parité fixe) : le montant doit correspondre (arrondi toléré) ;
   - dans toute autre devise : le montant converti ne peut pas être comparé. On accepte dès que SasPay
     confirme SUCCESS sur notre session (le prix est fixé côté serveur en FCFA, le client ne peut pas le changer),
     sauf si SasPay renvoie un montant demandé en FCFA qui diffère. */
export function paymentMatches(pay, expected, ownId = null) {
  const metaId = pay?.metadata?.payment_id || pay?.metadata?.sale_id;
  if (ownId && metaId && String(metaId) !== String(ownId)) return false;

  const tolerance = Math.max(2, Math.ceil(expected * 0.01));
  const near = (v) =>
    v !== undefined && v !== null && Number.isFinite(Number(v)) && Math.abs(Number(v) - expected) <= tolerance;

  const currency = String(pay?.currency || "").toUpperCase();
  if (currency === "XOF" || currency === "XAF") {
    return [pay.requested_amount, pay.amount, pay.net_amount].some(near);
  }

  const reqCur = String(pay?.requested_currency || "").toUpperCase();
  if ((reqCur === "XOF" || reqCur === "XAF") && pay.requested_amount !== undefined && pay.requested_amount !== null) {
    return near(pay.requested_amount);
  }
  return true;
                                                                                   }

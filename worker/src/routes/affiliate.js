import { parseCookies } from "../utils/cookies.js";
import { verifyJWT } from "../utils/jwt.js";
import { sendEmail } from "../utils/email.js";
import { PLANS, PLAN_DAYS } from "./billing.js";

/* ============================ RÈGLES DU PROGRAMME ============================ */

export const REWARD_TARGET = 3; // filleuls payants nécessaires pour gagner une récompense
export const REWARD_DAYS = PLAN_DAYS; // durée de l'abonnement offert (30 jours)
export const HOLD_DAYS = 7; // délai de validation après le paiement du filleul

/* ========================================================================= */

const RANK = { free: 0, pro: 1, business: 2 };
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O/1/I pour éviter les confusions
const DEFAULT_SITE_URL = "https://digitelio.com";
const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_MS = REWARD_DAYS * DAY_MS;

const json = (obj, status = 200) => Response.json(obj, { status });

/* ---------- Utilitaires ---------- */

async function authUser(request, env) {
  try {
    const token = parseCookies(request)["digitelio_session"];
    if (!token) return null;
    return await verifyJWT(token, env.JWT_SECRET);
  } catch {
    return null;
  }
}

function parseDb(s, endOfDay = false) {
  if (!s) return null;
  const str = String(s).trim();
  let iso;
  if (str.length <= 10) iso = `${str}T${endOfDay ? "23:59:59" : "00:00:00"}Z`;
  else iso = str.endsWith("Z") ? str.replace(" ", "T") : `${str.replace(" ", "T")}Z`;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

const toDb = (ms) => new Date(ms).toISOString().slice(0, 19).replace("T", " ");
const toIso = (ms) => (ms === null || ms === undefined ? null : new Date(ms).toISOString());

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/* john.doe+promo@gmail.com et johndoe@gmail.com = même personne */
function normalizeEmail(email) {
  const [local = "", domain = ""] = String(email || "").trim().toLowerCase().split("@");
  let l = local.split("+")[0];
  if (domain === "gmail.com" || domain === "googlemail.com") l = l.replace(/\./g, "");
  return `${l}@${domain === "googlemail.com" ? "gmail.com" : domain}`;
}

function maskName(full) {
  const s = String(full || "").trim();
  if (!s) return "Nouveau membre";
  const parts = s.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 20);
  const last = parts[parts.length - 1];
  return `${parts[0].slice(0, 20)} ${last.charAt(0).toUpperCase()}.`;
}

/* ---------- Tables (créées automatiquement, comme le reste du projet) ---------- */

let tablesReady = false;
async function ensureTables(env) {
  if (tablesReady) return;
  await env.DB.batch([
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS affiliate_codes (
        user_id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    ),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS referrals (
        referred_id TEXT PRIMARY KEY,
        referrer_id TEXT NOT NULL,
        code TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        consumed_at TEXT,
        reward_id TEXT
      )`
    ),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals (referrer_id)"),
    env.DB.prepare(
      `CREATE TABLE IF NOT EXISTS affiliate_rewards (
        id TEXT PRIMARY KEY,
        referrer_id TEXT NOT NULL,
        plan TEXT NOT NULL,
        days INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        seen_at TEXT
      )`
    ),
    env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_affiliate_rewards_referrer ON affiliate_rewards (referrer_id)"),
  ]);
  tablesReady = true;
}

/* ---------- Code d'affilié ---------- */

function randomCode(len = 8) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}

async function getOrCreateCode(env, userId) {
  const existing = await env.DB.prepare("SELECT code FROM affiliate_codes WHERE user_id = ?")
    .bind(userId)
    .first();
  if (existing?.code) return existing.code;

  for (let i = 0; i < 6; i++) {
    const code = randomCode(8);
    try {
      await env.DB.prepare("INSERT INTO affiliate_codes (user_id, code) VALUES (?, ?)")
        .bind(userId, code)
        .run();
      return code;
    } catch {
      // code déjà pris, ou création simultanée pour ce même compte
      const again = await env.DB.prepare("SELECT code FROM affiliate_codes WHERE user_id = ?")
        .bind(userId)
        .first();
      if (again?.code) return again.code;
    }
  }
  throw new Error("Impossible de créer le code d'affilié.");
}

/* ---------- Enregistrement d'un parrainage (appelé à l'inscription) ---------- */

export async function captureReferral(env, userId, email, rawCode) {
  try {
    const code = String(rawCode || "").trim().toUpperCase();
    if (!/^[A-Z0-9]{6,12}$/.test(code)) return;

    await ensureTables(env);
    const owner = await env.DB.prepare(
      `SELECT c.user_id AS id, u.email AS email
       FROM affiliate_codes c JOIN users u ON u.id = c.user_id
       WHERE c.code = ?`
    )
      .bind(code)
      .first();
    if (!owner || owner.id === userId) return;
    if (normalizeEmail(owner.email) === normalizeEmail(email)) return; // pas d'auto-parrainage

    await env.DB.prepare(
      "INSERT OR IGNORE INTO referrals (referred_id, referrer_id, code) VALUES (?, ?, ?)"
    )
      .bind(userId, owner.id, code)
      .run();
  } catch (err) {
    console.error("Parrainage non enregistré", err?.message);
  }
}

/* ---------- Lecture des filleuls et de leur statut ---------- */

/* Le 1er paiement d'abonnement du filleul est lu dans le journal plan_payments (créé par billing.js) */
async function loadReferrals(env, referrerId) {
  const head = "SELECT r.referred_id, r.created_at AS joined_at, r.consumed_at, r.reward_id, u.full_name";
  const tail = "FROM referrals r LEFT JOIN users u ON u.id = r.referred_id WHERE r.referrer_id = ? ORDER BY r.created_at DESC";
  try {
    const { results } = await env.DB.prepare(
      `${head},
        (SELECT p.plan FROM plan_payments p
          WHERE p.user_id = r.referred_id AND p.amount_xof > 0
          ORDER BY p.created_at ASC LIMIT 1) AS first_plan,
        (SELECT MIN(p.created_at) FROM plan_payments p
          WHERE p.user_id = r.referred_id AND p.amount_xof > 0) AS first_paid_at
       ${tail}`
    )
      .bind(referrerId)
      .all();
    return results || [];
  } catch {
    // plan_payments n'existe pas encore (aucun paiement dans l'application)
    const { results } = await env.DB.prepare(
      `${head}, NULL AS first_plan, NULL AS first_paid_at ${tail}`
    )
      .bind(referrerId)
      .all();
    return results || [];
  }
}

/* signup → inscrit, sans paiement | pending → payé, en cours de validation
   validated → validé, compte pour la récompense | rewarded → déjà utilisé */
function classify(row, now) {
  const paidMs = parseDb(row.first_paid_at);
  if (paidMs === null) return { status: "signup", paidMs: null, unlockMs: null };
  const unlockMs = paidMs + HOLD_DAYS * DAY_MS;
  if (row.consumed_at) return { status: "rewarded", paidMs, unlockMs };
  return { status: now >= unlockMs ? "validated" : "pending", paidMs, unlockMs };
}

const planKeyOf = (p) => (p && PLANS[p] && p !== "free" ? p : "pro");

/* ---------- Attribution de l'abonnement offert ---------- */

/* 30 jours offerts : jamais de rétrogradation.
   - plan actuel égal ou supérieur : on prolonge ce plan de 30 jours
   - plan actuel inférieur : on passe au plan gagné, sans perdre les jours restants
   - gratuit ou expiré : on active le plan gagné pour 30 jours
   Aucune écriture dans plan_payments : un cadeau n'est pas un revenu. */
async function grantFreePlan(env, userId, earnedKey) {
  const user = await env.DB.prepare(
    "SELECT id, plan, plan_started_at, plan_until FROM users WHERE id = ?"
  )
    .bind(userId)
    .first();
  if (!user) throw new Error("Compte introuvable.");

  const now = Date.now();
  const curKey = user.plan && user.plan !== "free" && PLANS[user.plan] ? user.plan : null;
  const untilMs = parseDb(user.plan_until, true);
  const active = !!curKey && (untilMs === null || untilMs > now);

  let planKey;
  let startMs;
  let newUntil;
  if (active && RANK[curKey] >= RANK[earnedKey]) {
    if (untilMs === null) return { plan: curKey, until: null }; // abonnement sans échéance
    planKey = curKey;
    startMs = parseDb(user.plan_started_at) ?? now;
    newUntil = untilMs + WINDOW_MS;
  } else if (active) {
    planKey = earnedKey;
    startMs = now;
    newUntil = (untilMs ?? now) + WINDOW_MS;
  } else {
    planKey = earnedKey;
    startMs = now;
    newUntil = now + WINDOW_MS;
  }

  await env.DB.prepare(
    `UPDATE users
     SET plan = ?, plan_started_at = ?, plan_until = ?, updated_at = datetime('now')
     WHERE id = ?`
  )
    .bind(planKey, toDb(startMs), toDb(newUntil), userId)
    .run();

  return { plan: planKey, until: toIso(newUntil) };
}

/* ---------- Email de félicitations ---------- */

function rewardEmailHtml(name, planName, appUrl) {
  const url = `${appUrl}/dashboard/abonnements`;
  return `
  <div style="font-family: -apple-system, Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #F7F7FB;">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-weight: 700; font-size: 18px; color: #0F0F1E;">DIGITELIO <span style="color: #7C3AED;">AI</span></span>
    </div>
    <div style="background: #fff; border-radius: 20px; padding: 32px 28px; box-shadow: 0 8px 24px rgba(16,16,40,0.06); text-align: center;">
      <div style="font-size: 44px; line-height: 1;">🎁</div>
      <h1 style="font-size: 22px; color: #0F0F1E; margin: 14px 0 10px;">Félicitations${name ? `, ${esc(name)}` : ""} !</h1>
      <p style="font-size: 14px; color: #6B6B85; line-height: 1.7; margin: 0 0 8px;">
        Vos ${REWARD_TARGET} filleuls se sont abonnés à Digitelio AI.
      </p>
      <p style="font-size: 15px; color: #0F0F1E; line-height: 1.7; margin: 0 0 22px;">
        Votre abonnement <strong>${esc(planName)}</strong> offert de <strong>${REWARD_DAYS} jours</strong> est déjà activé.
      </p>
      <a href="${esc(url)}" style="display: inline-block; background: linear-gradient(135deg,#3B82F6,#8B5CF6); color: #fff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 14px 32px; border-radius: 12px;">
        Voir mon abonnement
      </a>
      <p style="font-size: 12px; color: #9C9CB4; margin: 22px 0 0;">Continuez à inviter : chaque groupe de ${REWARD_TARGET} nouveaux abonnés vous offre un nouveau mois.</p>
    </div>
  </div>`;
}

async function sendRewardEmail(env, userId, planKey) {
  try {
    const user = await env.DB.prepare("SELECT full_name, email FROM users WHERE id = ?")
      .bind(userId)
      .first();
    if (!user?.email) return;
    const appUrl = String(env.APP_URL || DEFAULT_SITE_URL).replace(/\/$/, "");
    const firstName = String(user.full_name || "").trim().split(/\s+/)[0] || "";
    await sendEmail(env, {
      to: user.email,
      toName: user.full_name || user.email,
      subject: `🎁 Félicitations ! ${REWARD_DAYS} jours ${PLANS[planKey].name} offerts sur Digitelio AI`,
      html: rewardEmailHtml(firstName, PLANS[planKey].name, appUrl),
    });
  } catch (err) {
    console.error("Email de récompense non envoyé", err?.message);
  }
}

/* ---------- Moteur de récompense ---------- */

/* Vérifie les filleuls d'un affilié et accorde un abonnement par groupe de REWARD_TARGET filleuls validés */
export async function processReferrer(env, referrerId) {
  await ensureTables(env);
  const rows = await loadReferrals(env, referrerId);
  const now = Date.now();

  const ready = rows
    .map((r) => ({ ...r, ...classify(r, now) }))
    .filter((r) => r.status === "validated")
    .sort((a, b) => a.paidMs - b.paidMs);

  const granted = [];
  for (let i = 0; i + REWARD_TARGET <= ready.length; i += REWARD_TARGET) {
    const group = ready.slice(i, i + REWARD_TARGET);
    const rewardId = crypto.randomUUID();

    // 1) Réservation des filleuls : si un autre traitement est passé avant, on s'arrête
    const claimed = [];
    for (const r of group) {
      const res = await env.DB.prepare(
        "UPDATE referrals SET consumed_at = datetime('now'), reward_id = ? WHERE referred_id = ? AND consumed_at IS NULL"
      )
        .bind(rewardId, r.referred_id)
        .run();
      if (res.meta?.changes) claimed.push(r.referred_id);
    }
    if (claimed.length < group.length) {
      for (const id of claimed) {
        await env.DB.prepare(
          "UPDATE referrals SET consumed_at = NULL, reward_id = NULL WHERE referred_id = ? AND reward_id = ?"
        )
          .bind(id, rewardId)
          .run();
      }
      break;
    }

    // 2) Le plan gagné est le plus bas parmi les filleuls du groupe
    const earned = group
      .map((r) => planKeyOf(r.first_plan))
      .reduce((lo, p) => (RANK[p] < RANK[lo] ? p : lo), "business");

    try {
      const g = await grantFreePlan(env, referrerId, earned);
      await env.DB.prepare(
        "INSERT INTO affiliate_rewards (id, referrer_id, plan, days) VALUES (?, ?, ?, ?)"
      )
        .bind(rewardId, referrerId, g.plan, REWARD_DAYS)
        .run();
      granted.push({ id: rewardId, plan: g.plan });
    } catch (err) {
      // Échec : on libère les filleuls, la récompense sera retentée au prochain passage
      await env.DB.prepare(
        "UPDATE referrals SET consumed_at = NULL, reward_id = NULL WHERE reward_id = ?"
      )
        .bind(rewardId)
        .run();
      console.error("Récompense non accordée", referrerId, err?.message);
      break;
    }
  }

  for (const g of granted) await sendRewardEmail(env, referrerId, g.plan);
  return granted;
}

/* Parcourt tous les affiliés dont des filleuls ont passé le délai de validation (webhook + tâche planifiée) */
export async function sweepAffiliateRewards(env) {
  await ensureTables(env);
  let ids = [];
  try {
    const { results } = await env.DB.prepare(
      `SELECT DISTINCT r.referrer_id AS id FROM referrals r
       WHERE r.consumed_at IS NULL
         AND EXISTS (
           SELECT 1 FROM plan_payments p
           WHERE p.user_id = r.referred_id AND p.amount_xof > 0 AND p.created_at <= datetime('now', ?)
         )
       LIMIT 100`
    )
      .bind(`-${HOLD_DAYS} days`)
      .all();
    ids = (results || []).map((r) => r.id);
  } catch {
    return; // pas encore de paiements enregistrés
  }
  for (const id of ids) {
    try {
      await processReferrer(env, id);
    } catch (err) {
      console.error("Balayage affiliation en échec", id, err?.message);
    }
  }
}

/* ---------- Routes ---------- */

export async function handleAffiliateSummary(request, env) {
  const auth = await authUser(request, env);
  if (!auth) return json({ error: "Non authentifié." }, 401);

  await ensureTables(env);
  const code = await getOrCreateCode(env, auth.sub);
  await processReferrer(env, auth.sub);

  const now = Date.now();
  const rows = (await loadReferrals(env, auth.sub)).map((r) => ({ ...r, ...classify(r, now) }));

  const count = (s) => rows.filter((r) => r.status === s).length;
  const invited = rows.length;
  const paying = rows.filter((r) => r.status !== "signup").length;

  // Les 3 cases de la barre : filleuls payants pas encore utilisés, du plus ancien au plus récent
  const open = rows
    .filter((r) => r.status === "pending" || r.status === "validated")
    .sort((a, b) => a.paidMs - b.paidMs)
    .slice(0, REWARD_TARGET);
  const slots = Array.from({ length: REWARD_TARGET }, (_, i) => {
    const r = open[i];
    if (!r) return { state: "empty" };
    return {
      state: r.status,
      plan: planKeyOf(r.first_plan),
      unlock_at: toIso(r.unlockMs),
    };
  });

  const { results: rewardRows } = await env.DB.prepare(
    `SELECT id, plan, days, created_at, seen_at FROM affiliate_rewards
     WHERE referrer_id = ? ORDER BY created_at DESC LIMIT 20`
  )
    .bind(auth.sub)
    .all();
  const rewards = (rewardRows || []).map((r) => ({
    id: r.id,
    plan: r.plan,
    plan_name: PLANS[r.plan]?.name || r.plan,
    days: r.days,
    granted_at: toIso(parseDb(r.created_at)),
    seen: !!r.seen_at,
  }));
  const unseen = rewards.find((r) => !r.seen) || null;

  const base = String(env.APP_URL || DEFAULT_SITE_URL).replace(/\/$/, "");

  return json({
    code,
    share_url: `${base}/?ref=${code}`,
    rules: { target: REWARD_TARGET, reward_days: REWARD_DAYS, hold_days: HOLD_DAYS },
    stats: {
      invited,
      paying,
      pending: count("pending"),
      validated: count("validated"),
      rewards: rewards.length,
      days_earned: rewards.length * REWARD_DAYS,
      conversion: invited ? Math.round((paying / invited) * 100) : 0,
    },
    slots,
    referrals: rows.slice(0, 50).map((r) => ({
      name: maskName(r.full_name),
      status: r.status,
      plan: r.first_plan ? planKeyOf(r.first_plan) : null,
      joined_at: toIso(parseDb(r.joined_at)),
      paid_at: toIso(r.paidMs),
      unlock_at: toIso(r.unlockMs),
    })),
    rewards,
    unseen_reward: unseen,
    server_time: toIso(now),
  });
}

/* Léger : utilisé par toutes les pages du tableau de bord pour afficher la notification de félicitations */
export async function handleAffiliateNotice(request, env) {
  const auth = await authUser(request, env);
  if (!auth) return json({ reward: null });

  await ensureTables(env);
  const owns = await env.DB.prepare("SELECT 1 AS x FROM referrals WHERE referrer_id = ? LIMIT 1")
    .bind(auth.sub)
    .first();
  if (owns) await processReferrer(env, auth.sub);

  const r = await env.DB.prepare(
    `SELECT id, plan, days, created_at FROM affiliate_rewards
     WHERE referrer_id = ? AND seen_at IS NULL ORDER BY created_at DESC LIMIT 1`
  )
    .bind(auth.sub)
    .first();

  return json({
    reward: r
      ? {
          id: r.id,
          plan: r.plan,
          plan_name: PLANS[r.plan]?.name || r.plan,
          days: r.days,
          granted_at: toIso(parseDb(r.created_at)),
        }
      : null,
  });
}

export async function handleAffiliateSeen(request, env) {
  const auth = await authUser(request, env);
  if (!auth) return json({ error: "Non authentifié." }, 401);

  const body = await request.json().catch(() => null);
  const id = String(body?.id || "");
  if (!id) return json({ error: "Identifiant manquant." }, 400);

  await ensureTables(env);
  await env.DB.prepare(
    "UPDATE affiliate_rewards SET seen_at = datetime('now') WHERE id = ? AND referrer_id = ? AND seen_at IS NULL"
  )
    .bind(id, auth.sub)
    .run();

  return json({ ok: true });
              }
         

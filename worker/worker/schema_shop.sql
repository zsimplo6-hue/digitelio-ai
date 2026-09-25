-- ===== BOUTIQUE =====
CREATE TABLE IF NOT EXISTS shops (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  banner_url TEXT,
  logo_url TEXT,
  bio TEXT,
  accent_color TEXT DEFAULT '#7C3AED',
  socials_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_shops_slug ON shops(slug);

-- ===== LIENS PRODUIT =====
CREATE TABLE IF NOT EXISTS product_links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_slug TEXT NOT NULL,
  pay_code TEXT NOT NULL UNIQUE,
  price_xof INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, product_type, product_id)
);
CREATE INDEX IF NOT EXISTS idx_product_links_pay_code ON product_links(pay_code);
CREATE INDEX IF NOT EXISTS idx_product_links_slug ON product_links(user_id, product_slug);

-- ===== WALLET =====
CREATE TABLE IF NOT EXISTS wallets (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance_xof INTEGER NOT NULL DEFAULT 0,
  pending_xof INTEGER NOT NULL DEFAULT 0,
  total_withdrawn_xof INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ===== VENTES =====
CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_link_id TEXT NOT NULL REFERENCES product_links(id),
  buyer_email TEXT,
  buyer_name TEXT,
  amount_xof INTEGER NOT NULL,
  commission_pct REAL NOT NULL,
  fee_xof INTEGER NOT NULL,
  net_xof INTEGER NOT NULL,
  session_id TEXT,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_sales_seller ON sales(seller_id);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);

-- ===== RETRAITS =====
CREATE TABLE IF NOT EXISTS withdrawals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_xof INTEGER NOT NULL,
  method TEXT,
  status TEXT NOT NULL DEFAULT 'REQUESTED',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  processed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);

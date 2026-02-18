CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE clearance_decisions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    container_id        VARCHAR(30)  NOT NULL,
    importer_gstin      VARCHAR(20)  NOT NULL,
    risk_score          FLOAT        NOT NULL,
    lane                VARCHAR(10)  CHECK (lane IN ('GREEN', 'YELLOW', 'RED')),
    vision_anomaly      BOOLEAN,
    vision_confidence   FLOAT,
    blockchain_trust    FLOAT,
    heatmap_s3_url      TEXT,
    officer_override    BOOLEAN      DEFAULT FALSE,
    override_reason     TEXT,
    created_at          TIMESTAMPTZ  DEFAULT NOW(),
    audit_hash          VARCHAR(64)
);

CREATE INDEX idx_clearance_importer ON clearance_decisions(importer_gstin);
CREATE INDEX idx_clearance_created  ON clearance_decisions(created_at DESC);

CREATE TABLE tariff_risk_weights (
    hs_code           VARCHAR(12)  PRIMARY KEY,
    description       TEXT,
    risk_weight       FLOAT        NOT NULL DEFAULT 1.0,
    budget_year       INTEGER,
    effective_from    DATE,
    last_synced_at    TIMESTAMPTZ
);

CREATE TABLE ml_training_queue (
    id              UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    clearance_id    UUID      REFERENCES clearance_decisions(id),
    label_correct   BOOLEAN,
    officer_label   VARCHAR(20),
    flagged_at      TIMESTAMPTZ     DEFAULT NOW(),
    trained         BOOLEAN         DEFAULT FALSE
);

CREATE TABLE officer_overrides (
    id              UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    clearance_id    UUID      REFERENCES clearance_decisions(id),
    officer_id      VARCHAR(30) NOT NULL,
    original_lane   VARCHAR(10),
    override_lane   VARCHAR(10),
    reason          TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

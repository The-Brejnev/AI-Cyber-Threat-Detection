-- ============================================================
-- CyberGuard AI - Cyber Threat Detection System
-- PostgreSQL Database Schema
-- Compatible with pgAdmin 4
-- ============================================================

-- Create database (run as superuser if needed)
-- CREATE DATABASE cyber_threat_detection;

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM ('user', 'admin', 'analyst');
CREATE TYPE device_type AS ENUM ('server', 'workstation', 'router', 'firewall', 'iot', 'other');
CREATE TYPE device_status AS ENUM ('active', 'inactive', 'compromised');
CREATE TYPE threat_type AS ENUM (
    'NORMAL', 'PORT_SCAN', 'BRUTE_FORCE', 'DDOS', 'DOS',
    'BOTNET', 'MALWARE', 'SUSPICIOUS_LOGIN', 'SQL_INJECTION',
    'XSS', 'DATA_EXFILTRATION', 'RECONNAISSANCE',
    'UNAUTHORIZED_ACCESS', 'ANOMALOUS_TRAFFIC'
);
CREATE TYPE severity_level AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE threat_status AS ENUM ('active', 'investigating', 'resolved', 'false_positive');
CREATE TYPE notification_type AS ENUM ('threat', 'system', 'info');
CREATE TYPE otp_purpose AS ENUM ('registration', 'password_reset');
CREATE TYPE scan_type AS ENUM ('network', 'vulnerability', 'port', 'full');
CREATE TYPE scan_status AS ENUM ('pending', 'running', 'completed', 'failed');
CREATE TYPE audit_status AS ENUM ('success', 'failure');
CREATE TYPE protocol_type AS ENUM ('TCP', 'UDP', 'ICMP', 'OTHER');

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active       BOOLEAN DEFAULT TRUE NOT NULL,
    is_verified     BOOLEAN DEFAULT FALSE NOT NULL,
    role            user_role DEFAULT 'user' NOT NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    last_login      TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- ============================================================
-- TABLE: user_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS user_profiles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name   VARCHAR(255) NOT NULL,
    phone       VARCHAR(50),
    avatar_url  VARCHAR(500),
    timezone    VARCHAR(100) DEFAULT 'UTC' NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- ============================================================
-- TABLE: user_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS user_settings (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email_notifications   BOOLEAN DEFAULT TRUE NOT NULL,
    sms_notifications     BOOLEAN DEFAULT FALSE NOT NULL,
    critical_alerts       BOOLEAN DEFAULT TRUE NOT NULL,
    high_alerts           BOOLEAN DEFAULT TRUE NOT NULL,
    medium_alerts         BOOLEAN DEFAULT FALSE NOT NULL,
    low_alerts            BOOLEAN DEFAULT FALSE NOT NULL,
    dashboard_refresh     INTEGER DEFAULT 30 NOT NULL,
    theme                 VARCHAR(20) DEFAULT 'dark' NOT NULL,
    created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- ============================================================
-- TABLE: devices
-- ============================================================
CREATE TABLE IF NOT EXISTS devices (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    ip_address  VARCHAR(45) NOT NULL,
    mac_address VARCHAR(17),
    device_type device_type DEFAULT 'other' NOT NULL,
    os_type     VARCHAR(100),
    status      device_status DEFAULT 'active' NOT NULL,
    last_seen   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_ip_address ON devices(ip_address);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);

-- ============================================================
-- TABLE: network_events
-- ============================================================
CREATE TABLE IF NOT EXISTS network_events (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id        UUID REFERENCES devices(id) ON DELETE SET NULL,
    source_ip        VARCHAR(45) NOT NULL,
    destination_ip   VARCHAR(45) NOT NULL,
    source_port      INTEGER,
    destination_port INTEGER,
    protocol         VARCHAR(10) DEFAULT 'TCP' NOT NULL,
    bytes_sent       BIGINT DEFAULT 0,
    bytes_received   BIGINT DEFAULT 0,
    duration_ms      FLOAT DEFAULT 0,
    flags            VARCHAR(100),
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_network_events_user_id ON network_events(user_id);
CREATE INDEX IF NOT EXISTS idx_network_events_source_ip ON network_events(source_ip);
CREATE INDEX IF NOT EXISTS idx_network_events_created_at ON network_events(created_at);
CREATE INDEX IF NOT EXISTS idx_network_events_device_id ON network_events(device_id);

-- ============================================================
-- TABLE: threats
-- ============================================================
CREATE TABLE IF NOT EXISTS threats (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    network_event_id  UUID REFERENCES network_events(id) ON DELETE SET NULL,
    threat_type       threat_type NOT NULL,
    severity          severity_level NOT NULL,
    risk_score        FLOAT NOT NULL DEFAULT 0,
    confidence        FLOAT NOT NULL DEFAULT 0,
    source_ip         VARCHAR(45) NOT NULL,
    destination_ip    VARCHAR(45) NOT NULL,
    source_port       INTEGER,
    destination_port  INTEGER,
    protocol          VARCHAR(10),
    device_id         UUID REFERENCES devices(id) ON DELETE SET NULL,
    ml_model          VARCHAR(100) DEFAULT 'RandomForest',
    detection_reason  TEXT,
    recommended_action TEXT,
    status            threat_status DEFAULT 'active' NOT NULL,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_threats_user_id ON threats(user_id);
CREATE INDEX IF NOT EXISTS idx_threats_severity ON threats(severity);
CREATE INDEX IF NOT EXISTS idx_threats_threat_type ON threats(threat_type);
CREATE INDEX IF NOT EXISTS idx_threats_source_ip ON threats(source_ip);
CREATE INDEX IF NOT EXISTS idx_threats_created_at ON threats(created_at);
CREATE INDEX IF NOT EXISTS idx_threats_status ON threats(status);
CREATE INDEX IF NOT EXISTS idx_threats_device_id ON threats(device_id);

-- ============================================================
-- TABLE: threat_predictions
-- ============================================================
CREATE TABLE IF NOT EXISTS threat_predictions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    network_event_id  UUID REFERENCES network_events(id) ON DELETE CASCADE,
    threat_id         UUID REFERENCES threats(id) ON DELETE SET NULL,
    raw_prediction    JSONB,
    features_used     JSONB,
    model_version     VARCHAR(50),
    prediction_time_ms FLOAT,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_threat_predictions_user_id ON threat_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_threat_predictions_threat_id ON threat_predictions(threat_id);
CREATE INDEX IF NOT EXISTS idx_threat_predictions_created_at ON threat_predictions(created_at);

-- ============================================================
-- TABLE: scans
-- ============================================================
CREATE TABLE IF NOT EXISTS scans (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scan_type     scan_type DEFAULT 'network' NOT NULL,
    status        scan_status DEFAULT 'pending' NOT NULL,
    target_ip     VARCHAR(45),
    total_events  INTEGER DEFAULT 0,
    threats_found INTEGER DEFAULT 0,
    started_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at  TIMESTAMP WITH TIME ZONE,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans(status);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at);

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title             VARCHAR(255) NOT NULL,
    message           TEXT NOT NULL,
    notification_type notification_type DEFAULT 'info' NOT NULL,
    severity          severity_level,
    threat_id         UUID REFERENCES threats(id) ON DELETE SET NULL,
    is_read           BOOLEAN DEFAULT FALSE NOT NULL,
    email_sent        BOOLEAN DEFAULT FALSE NOT NULL,
    sms_sent          BOOLEAN DEFAULT FALSE NOT NULL,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_severity ON notifications(severity);

-- ============================================================
-- TABLE: otp_codes
-- ============================================================
CREATE TABLE IF NOT EXISTS otp_codes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) NOT NULL,
    hashed_otp  VARCHAR(255) NOT NULL,
    purpose     otp_purpose NOT NULL,
    is_used     BOOLEAN DEFAULT FALSE NOT NULL,
    attempts    INTEGER DEFAULT 0 NOT NULL,
    expires_at  TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes(email);
CREATE INDEX IF NOT EXISTS idx_otp_codes_purpose ON otp_codes(purpose);
CREATE INDEX IF NOT EXISTS idx_otp_codes_expires_at ON otp_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_codes_is_used ON otp_codes(is_used);

-- ============================================================
-- TABLE: blocked_ips
-- ============================================================
CREATE TABLE IF NOT EXISTS blocked_ips (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address    VARCHAR(45) NOT NULL,
    reason        TEXT NOT NULL,
    threat_type   VARCHAR(100),
    blocked_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    unblocked_at  TIMESTAMP WITH TIME ZONE,
    is_active     BOOLEAN DEFAULT TRUE NOT NULL,
    blocked_by    VARCHAR(50) DEFAULT 'user' NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_user_id ON blocked_ips(user_id);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip_address ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_is_active ON blocked_ips(is_active);

-- ============================================================
-- TABLE: audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
    action        VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100),
    resource_id   VARCHAR(255),
    ip_address    VARCHAR(45),
    user_agent    TEXT,
    status        audit_status DEFAULT 'success' NOT NULL,
    details       JSONB,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);

-- ============================================================
-- TRIGGERS: Auto-update updated_at timestamps
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_threats_updated_at
    BEFORE UPDATE ON threats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- VIEWS (optional, for pgAdmin analysis)
-- ============================================================
CREATE OR REPLACE VIEW v_threat_summary AS
SELECT
    t.user_id,
    t.threat_type,
    t.severity,
    COUNT(*) as count,
    AVG(t.risk_score) as avg_risk_score,
    MAX(t.created_at) as last_seen
FROM threats t
GROUP BY t.user_id, t.threat_type, t.severity;

CREATE OR REPLACE VIEW v_top_attacking_ips AS
SELECT
    t.user_id,
    t.source_ip,
    COUNT(*) as attack_count,
    MAX(t.severity::text) as max_severity,
    MAX(t.created_at) as last_seen,
    ARRAY_AGG(DISTINCT t.threat_type::text) as threat_types
FROM threats t
WHERE t.threat_type != 'NORMAL'
GROUP BY t.user_id, t.source_ip
ORDER BY attack_count DESC;

-- ============================================================
-- End of Schema
-- ============================================================

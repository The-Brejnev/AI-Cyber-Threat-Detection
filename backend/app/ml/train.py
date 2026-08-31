#!/usr/bin/env python3
"""
CyberGuard AI - Standalone ML Training Script
Run: python -m app.ml.train
"""

import os
import json
import uuid
import logging
import numpy as np
import pandas as pd
from datetime import datetime
from pathlib import Path

from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    classification_report
)
import joblib

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# ─── Constants ───────────────────────────────────────────────────────────────

MODELS_DIR = Path(__file__).parent / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

THREAT_CLASSES = [
    "NORMAL", "PORT_SCAN", "BRUTE_FORCE", "DDOS", "DOS",
    "BOTNET", "MALWARE", "SUSPICIOUS_LOGIN", "SQL_INJECTION",
    "XSS", "DATA_EXFILTRATION", "RECONNAISSANCE",
    "UNAUTHORIZED_ACCESS", "ANOMALOUS_TRAFFIC"
]

SAMPLES_PER_CLASS = 5000
RANDOM_STATE = 42

# ─── Synthetic Data Generator ─────────────────────────────────────────────────

def _rng(seed=None):
    return np.random.default_rng(seed)


def _gen_normal(n, rng):
    """Generate normal traffic features."""
    rows = []
    for _ in range(n):
        src_port = rng.integers(1024, 65535)
        dst_port = rng.choice([80, 443, 8080, 8443, 3000, 5000])
        bytes_s = rng.integers(100, 5000)
        bytes_r = rng.integers(500, 20000)
        duration = rng.uniform(10, 2000)
        rows.append({
            "source_port": src_port / 65535,
            "destination_port": dst_port / 65535,
            "protocol_encoded": rng.choice([0, 1]),  # TCP / UDP
            "bytes_sent": np.log1p(bytes_s) / 15,
            "bytes_received": np.log1p(bytes_r) / 15,
            "duration_ms": np.log1p(duration) / 15,
            "bytes_ratio": bytes_s / (bytes_r + 1),
            "port_risk_score": 0.05,
            "is_private_source": 1,
            "is_private_dest": 1,
            "flag_syn": rng.choice([0, 1], p=[0.7, 0.3]),
            "flag_rst": 0,
            "flag_fin": rng.choice([0, 1], p=[0.8, 0.2]),
            "high_port_count": 1 if src_port > 49152 else 0,
            "small_packet": 0,
            "large_packet": 0,
            "repeated_attempts": rng.uniform(0, 0.1),
            "unusual_hour": 0,
            "port_scan_indicator": 0,
            "traffic_asymmetry": abs(bytes_s - bytes_r) / (bytes_s + bytes_r + 1),
        })
    return rows


def _gen_port_scan(n, rng):
    rows = []
    for _ in range(n):
        dst_port = rng.integers(1, 10000)
        bytes_s = rng.integers(40, 200)
        bytes_r = rng.integers(0, 50)
        rows.append({
            "source_port": rng.integers(40000, 65535) / 65535,
            "destination_port": dst_port / 65535,
            "protocol_encoded": 0,  # TCP
            "bytes_sent": np.log1p(bytes_s) / 15,
            "bytes_received": np.log1p(bytes_r) / 15,
            "duration_ms": np.log1p(rng.uniform(1, 100)) / 15,
            "bytes_ratio": bytes_s / (bytes_r + 1),
            "port_risk_score": 0.8 if dst_port < 1024 else 0.3,
            "is_private_source": 0,
            "is_private_dest": 1,
            "flag_syn": 1,
            "flag_rst": rng.choice([0, 1], p=[0.3, 0.7]),
            "flag_fin": 0,
            "high_port_count": 0,
            "small_packet": 1,
            "large_packet": 0,
            "repeated_attempts": rng.uniform(0.5, 1.0),
            "unusual_hour": rng.choice([0, 1], p=[0.6, 0.4]),
            "port_scan_indicator": 1,
            "traffic_asymmetry": abs(bytes_s - bytes_r) / (bytes_s + bytes_r + 1),
        })
    return rows


def _gen_brute_force(n, rng):
    rows = []
    for _ in range(n):
        dst_port = rng.choice([22, 3389, 21, 3306, 5432])
        bytes_s = rng.integers(100, 500)
        bytes_r = rng.integers(100, 400)
        risk = 0.7 if dst_port == 22 else 0.8 if dst_port == 3389 else 0.6
        rows.append({
            "source_port": rng.integers(40000, 65535) / 65535,
            "destination_port": dst_port / 65535,
            "protocol_encoded": 0,
            "bytes_sent": np.log1p(bytes_s) / 15,
            "bytes_received": np.log1p(bytes_r) / 15,
            "duration_ms": np.log1p(rng.uniform(50, 500)) / 15,
            "bytes_ratio": bytes_s / (bytes_r + 1),
            "port_risk_score": risk,
            "is_private_source": 0,
            "is_private_dest": 1,
            "flag_syn": 1,
            "flag_rst": 0,
            "flag_fin": 0,
            "high_port_count": 0,
            "small_packet": 1,
            "large_packet": 0,
            "repeated_attempts": rng.uniform(0.7, 1.0),
            "unusual_hour": rng.choice([0, 1], p=[0.5, 0.5]),
            "port_scan_indicator": 0,
            "traffic_asymmetry": abs(bytes_s - bytes_r) / (bytes_s + bytes_r + 1),
        })
    return rows


def _gen_ddos(n, rng):
    rows = []
    for _ in range(n):
        bytes_s = rng.integers(10000, 100000)
        bytes_r = rng.integers(100, 1000)
        rows.append({
            "source_port": rng.integers(1024, 65535) / 65535,
            "destination_port": rng.choice([80, 443]) / 65535,
            "protocol_encoded": rng.choice([0, 1, 2]),
            "bytes_sent": np.log1p(bytes_s) / 15,
            "bytes_received": np.log1p(bytes_r) / 15,
            "duration_ms": np.log1p(rng.uniform(1, 100)) / 15,
            "bytes_ratio": bytes_s / (bytes_r + 1),
            "port_risk_score": 0.2,
            "is_private_source": 0,
            "is_private_dest": 1,
            "flag_syn": 1,
            "flag_rst": 0,
            "flag_fin": 0,
            "high_port_count": 0,
            "small_packet": 0,
            "large_packet": 1,
            "repeated_attempts": rng.uniform(0.8, 1.0),
            "unusual_hour": rng.choice([0, 1]),
            "port_scan_indicator": 0,
            "traffic_asymmetry": abs(bytes_s - bytes_r) / (bytes_s + bytes_r + 1),
        })
    return rows


def _gen_dos(n, rng):
    rows = []
    for _ in range(n):
        bytes_s = rng.integers(5000, 50000)
        bytes_r = rng.integers(0, 500)
        rows.append({
            "source_port": rng.integers(1024, 65535) / 65535,
            "destination_port": rng.choice([80, 443, 8080]) / 65535,
            "protocol_encoded": 0,
            "bytes_sent": np.log1p(bytes_s) / 15,
            "bytes_received": np.log1p(bytes_r) / 15,
            "duration_ms": np.log1p(rng.uniform(5000, 60000)) / 15,
            "bytes_ratio": bytes_s / (bytes_r + 1),
            "port_risk_score": 0.2,
            "is_private_source": 0,
            "is_private_dest": 1,
            "flag_syn": 1,
            "flag_rst": 0,
            "flag_fin": 0,
            "high_port_count": 0,
            "small_packet": 0,
            "large_packet": 1,
            "repeated_attempts": rng.uniform(0.6, 1.0),
            "unusual_hour": rng.choice([0, 1]),
            "port_scan_indicator": 0,
            "traffic_asymmetry": abs(bytes_s - bytes_r) / (bytes_s + bytes_r + 1),
        })
    return rows


def _gen_botnet(n, rng):
    rows = []
    for _ in range(n):
        bytes_s = rng.integers(200, 2000)
        bytes_r = rng.integers(200, 2000)
        rows.append({
            "source_port": rng.integers(1024, 65535) / 65535,
            "destination_port": rng.choice([6667, 4444, 1080, 8080, 443]) / 65535,
            "protocol_encoded": rng.choice([0, 1]),
            "bytes_sent": np.log1p(bytes_s) / 15,
            "bytes_received": np.log1p(bytes_r) / 15,
            "duration_ms": np.log1p(rng.uniform(100, 5000)) / 15,
            "bytes_ratio": bytes_s / (bytes_r + 1),
            "port_risk_score": 0.7,
            "is_private_source": 1,
            "is_private_dest": 0,
            "flag_syn": 0,
            "flag_rst": 0,
            "flag_fin": 0,
            "high_port_count": 0,
            "small_packet": 0,
            "large_packet": 0,
            "repeated_attempts": rng.uniform(0.3, 0.8),
            "unusual_hour": 1,
            "port_scan_indicator": 0,
            "traffic_asymmetry": abs(bytes_s - bytes_r) / (bytes_s + bytes_r + 1),
        })
    return rows


def _gen_malware(n, rng):
    rows = []
    for _ in range(n):
        bytes_s = rng.integers(500, 5000)
        bytes_r = rng.integers(5000, 50000)
        rows.append({
            "source_port": rng.integers(1024, 65535) / 65535,
            "destination_port": rng.choice([4444, 8888, 9999, 31337, 1234]) / 65535,
            "protocol_encoded": 0,
            "bytes_sent": np.log1p(bytes_s) / 15,
            "bytes_received": np.log1p(bytes_r) / 15,
            "duration_ms": np.log1p(rng.uniform(1000, 10000)) / 15,
            "bytes_ratio": bytes_s / (bytes_r + 1),
            "port_risk_score": 0.9,
            "is_private_source": 1,
            "is_private_dest": 0,
            "flag_syn": 0,
            "flag_rst": 0,
            "flag_fin": 0,
            "high_port_count": 0,
            "small_packet": 0,
            "large_packet": 1,
            "repeated_attempts": rng.uniform(0.2, 0.6),
            "unusual_hour": 1,
            "port_scan_indicator": 0,
            "traffic_asymmetry": abs(bytes_s - bytes_r) / (bytes_s + bytes_r + 1),
        })
    return rows


def _gen_suspicious_login(n, rng):
    rows = []
    for _ in range(n):
        dst_port = rng.choice([22, 3389, 3306, 5432, 5900])
        bytes_s = rng.integers(200, 1000)
        bytes_r = rng.integers(100, 800)
        rows.append({
            "source_port": rng.integers(40000, 65535) / 65535,
            "destination_port": dst_port / 65535,
            "protocol_encoded": 0,
            "bytes_sent": np.log1p(bytes_s) / 15,
            "bytes_received": np.log1p(bytes_r) / 15,
            "duration_ms": np.log1p(rng.uniform(500, 5000)) / 15,
            "bytes_ratio": bytes_s / (bytes_r + 1),
            "port_risk_score": 0.75,
            "is_private_source": 0,
            "is_private_dest": 1,
            "flag_syn": 1,
            "flag_rst": 0,
            "flag_fin": 0,
            "high_port_count": 0,
            "small_packet": 1,
            "large_packet": 0,
            "repeated_attempts": rng.uniform(0.4, 0.9),
            "unusual_hour": rng.choice([0, 1], p=[0.4, 0.6]),
            "port_scan_indicator": 0,
            "traffic_asymmetry": abs(bytes_s - bytes_r) / (bytes_s + bytes_r + 1),
        })
    return rows


def _gen_sql_injection(n, rng):
    rows = []
    for _ in range(n):
        bytes_s = rng.integers(1000, 8000)
        bytes_r = rng.integers(500, 5000)
        rows.append({
            "source_port": rng.integers(40000, 65535) / 65535,
            "destination_port": rng.choice([3306, 5432, 1433, 1521]) / 65535,
            "protocol_encoded": 0,
            "bytes_sent": np.log1p(bytes_s) / 15,
            "bytes_received": np.log1p(bytes_r) / 15,
            "duration_ms": np.log1p(rng.uniform(100, 2000)) / 15,
            "bytes_ratio": bytes_s / (bytes_r + 1),
            "port_risk_score": 0.85,
            "is_private_source": 0,
            "is_private_dest": 1,
            "flag_syn": 0,
            "flag_rst": 0,
            "flag_fin": 0,
            "high_port_count": 0,
            "small_packet": 0,
            "large_packet": 0,
            "repeated_attempts": rng.uniform(0.3, 0.7),
            "unusual_hour": rng.choice([0, 1]),
            "port_scan_indicator": 0,
            "traffic_asymmetry": abs(bytes_s - bytes_r) / (bytes_s + bytes_r + 1),
        })
    return rows


def _gen_xss(n, rng):
    rows = []
    for _ in range(n):
        bytes_s = rng.integers(2000, 10000)
        bytes_r = rng.integers(1000, 8000)
        rows.append({
            "source_port": rng.integers(40000, 65535) / 65535,
            "destination_port": rng.choice([80, 443, 8080]) / 65535,
            "protocol_encoded": 0,
            "bytes_sent": np.log1p(bytes_s) / 15,
            "bytes_received": np.log1p(bytes_r) / 15,
            "duration_ms": np.log1p(rng.uniform(50, 1000)) / 15,
            "bytes_ratio": bytes_s / (bytes_r + 1),
            "port_risk_score": 0.2,
            "is_private_source": 0,
            "is_private_dest": 1,
            "flag_syn": 0,
            "flag_rst": 0,
            "flag_fin": 0,
            "high_port_count": 0,
            "small_packet": 0,
            "large_packet": 0,
            "repeated_attempts": rng.uniform(0.2, 0.5),
            "unusual_hour": rng.choice([0, 1]),
            "port_scan_indicator": 0,
            "traffic_asymmetry": abs(bytes_s - bytes_r) / (bytes_s + bytes_r + 1),
        })
    return rows


def _gen_data_exfiltration(n, rng):
    rows = []
    for _ in range(n):
        bytes_s = rng.integers(50000, 500000)
        bytes_r = rng.integers(100, 1000)
        rows.append({
            "source_port": rng.integers(1024, 65535) / 65535,
            "destination_port": rng.choice([21, 22, 443, 8080, 4444]) / 65535,
            "protocol_encoded": rng.choice([0, 1]),
            "bytes_sent": np.log1p(bytes_s) / 15,
            "bytes_received": np.log1p(bytes_r) / 15,
            "duration_ms": np.log1p(rng.uniform(5000, 60000)) / 15,
            "bytes_ratio": bytes_s / (bytes_r + 1),
            "port_risk_score": 0.6,
            "is_private_source": 1,
            "is_private_dest": 0,
            "flag_syn": 0,
            "flag_rst": 0,
            "flag_fin": 0,
            "high_port_count": 0,
            "small_packet": 0,
            "large_packet": 1,
            "repeated_attempts": rng.uniform(0.1, 0.4),
            "unusual_hour": 1,
            "port_scan_indicator": 0,
            "traffic_asymmetry": abs(bytes_s - bytes_r) / (bytes_s + bytes_r + 1),
        })
    return rows


def _gen_reconnaissance(n, rng):
    rows = []
    for _ in range(n):
        bytes_s = rng.integers(40, 150)
        bytes_r = rng.integers(0, 100)
        rows.append({
            "source_port": rng.integers(40000, 65535) / 65535,
            "destination_port": rng.integers(1, 10000) / 65535,
            "protocol_encoded": rng.choice([0, 2]),  # TCP / ICMP
            "bytes_sent": np.log1p(bytes_s) / 15,
            "bytes_received": np.log1p(bytes_r) / 15,
            "duration_ms": np.log1p(rng.uniform(1, 50)) / 15,
            "bytes_ratio": bytes_s / (bytes_r + 1),
            "port_risk_score": 0.5,
            "is_private_source": 0,
            "is_private_dest": 1,
            "flag_syn": 1,
            "flag_rst": 1,
            "flag_fin": 0,
            "high_port_count": 0,
            "small_packet": 1,
            "large_packet": 0,
            "repeated_attempts": rng.uniform(0.6, 1.0),
            "unusual_hour": rng.choice([0, 1]),
            "port_scan_indicator": 1,
            "traffic_asymmetry": abs(bytes_s - bytes_r) / (bytes_s + bytes_r + 1),
        })
    return rows


def _gen_unauthorized_access(n, rng):
    rows = []
    for _ in range(n):
        dst_port = rng.choice([22, 3389, 23, 2323, 8022])
        bytes_s = rng.integers(300, 2000)
        bytes_r = rng.integers(200, 1500)
        rows.append({
            "source_port": rng.integers(40000, 65535) / 65535,
            "destination_port": dst_port / 65535,
            "protocol_encoded": 0,
            "bytes_sent": np.log1p(bytes_s) / 15,
            "bytes_received": np.log1p(bytes_r) / 15,
            "duration_ms": np.log1p(rng.uniform(500, 8000)) / 15,
            "bytes_ratio": bytes_s / (bytes_r + 1),
            "port_risk_score": 0.85 if dst_port == 23 else 0.75,
            "is_private_source": 0,
            "is_private_dest": 1,
            "flag_syn": 1,
            "flag_rst": 0,
            "flag_fin": 0,
            "high_port_count": 0,
            "small_packet": 0,
            "large_packet": 0,
            "repeated_attempts": rng.uniform(0.2, 0.6),
            "unusual_hour": 1,
            "port_scan_indicator": 0,
            "traffic_asymmetry": abs(bytes_s - bytes_r) / (bytes_s + bytes_r + 1),
        })
    return rows


def _gen_anomalous_traffic(n, rng):
    rows = []
    for _ in range(n):
        bytes_s = rng.choice([
            rng.integers(1, 50),
            rng.integers(100000, 1000000),
            rng.integers(500, 2000)
        ])
        bytes_r = rng.integers(0, 5000)
        dst_port = rng.choice([0, 1, 19, 135, 139, 445, 500, 1900, 7, 11])
        rows.append({
            "source_port": rng.integers(0, 65535) / 65535,
            "destination_port": dst_port / 65535,
            "protocol_encoded": rng.integers(0, 4),
            "bytes_sent": np.log1p(bytes_s) / 15,
            "bytes_received": np.log1p(bytes_r) / 15,
            "duration_ms": np.log1p(rng.uniform(0, 100000)) / 15,
            "bytes_ratio": bytes_s / (bytes_r + 1),
            "port_risk_score": rng.uniform(0.4, 0.9),
            "is_private_source": rng.choice([0, 1]),
            "is_private_dest": rng.choice([0, 1]),
            "flag_syn": rng.choice([0, 1]),
            "flag_rst": rng.choice([0, 1]),
            "flag_fin": rng.choice([0, 1]),
            "high_port_count": rng.choice([0, 1]),
            "small_packet": 1 if bytes_s < 50 else 0,
            "large_packet": 1 if bytes_s > 100000 else 0,
            "repeated_attempts": rng.uniform(0, 1),
            "unusual_hour": rng.choice([0, 1]),
            "port_scan_indicator": rng.choice([0, 1]),
            "traffic_asymmetry": abs(bytes_s - bytes_r) / (bytes_s + bytes_r + 1),
        })
    return rows


# ─── Main Training Function ────────────────────────────────────────────────────

def generate_dataset():
    """Generate synthetic dataset with realistic feature distributions."""
    logger.info(f"Generating synthetic dataset ({SAMPLES_PER_CLASS} samples per class)...")
    rng = _rng(RANDOM_STATE)

    generators = {
        "NORMAL": _gen_normal,
        "PORT_SCAN": _gen_port_scan,
        "BRUTE_FORCE": _gen_brute_force,
        "DDOS": _gen_ddos,
        "DOS": _gen_dos,
        "BOTNET": _gen_botnet,
        "MALWARE": _gen_malware,
        "SUSPICIOUS_LOGIN": _gen_suspicious_login,
        "SQL_INJECTION": _gen_sql_injection,
        "XSS": _gen_xss,
        "DATA_EXFILTRATION": _gen_data_exfiltration,
        "RECONNAISSANCE": _gen_reconnaissance,
        "UNAUTHORIZED_ACCESS": _gen_unauthorized_access,
        "ANOMALOUS_TRAFFIC": _gen_anomalous_traffic,
    }

    all_rows = []
    all_labels = []
    for label, gen_fn in generators.items():
        rows = gen_fn(SAMPLES_PER_CLASS, rng)
        all_rows.extend(rows)
        all_labels.extend([label] * SAMPLES_PER_CLASS)
        logger.info(f"  Generated {SAMPLES_PER_CLASS} {label} samples")

    df = pd.DataFrame(all_rows)
    labels = pd.Series(all_labels)
    # Clip all values to [0, 1] range for safety
    df = df.clip(0, None)
    logger.info(f"Total dataset: {len(df)} samples, {len(df.columns)} features")
    return df, labels


def train_and_save():
    """Train RF classifier + Isolation Forest and save all artifacts."""
    df, labels = generate_dataset()

    # Label encode
    le = LabelEncoder()
    y = le.fit_transform(labels)

    X = df.values

    # Train/test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y
    )

    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # ── Random Forest ──────────────────────────────────────────────────────
    logger.info("Training Random Forest classifier (n_estimators=100)...")
    rf_model = RandomForestClassifier(
        n_estimators=100,
        max_depth=20,
        min_samples_split=5,
        random_state=RANDOM_STATE,
        n_jobs=-1,
        class_weight="balanced",
    )
    rf_model.fit(X_train_scaled, y_train)
    logger.info("Random Forest training complete.")

    # Evaluate on test set
    y_pred = rf_model.predict(X_test_scaled)
    accuracy  = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    recall    = recall_score(y_test, y_pred, average="weighted", zero_division=0)
    f1        = f1_score(y_test, y_pred, average="weighted", zero_division=0)

    logger.info("=" * 50)
    logger.info("EVALUATION RESULTS (test set):")
    logger.info(f"  Accuracy:  {accuracy:.4f}")
    logger.info(f"  Precision: {precision:.4f}")
    logger.info(f"  Recall:    {recall:.4f}")
    logger.info(f"  F1 Score:  {f1:.4f}")
    logger.info("=" * 50)

    # ── Isolation Forest (anomaly detection on NORMAL samples) ─────────────
    logger.info("Training Isolation Forest on NORMAL samples...")
    normal_idx = labels[labels == "NORMAL"].index
    X_normal = scaler.transform(df.loc[normal_idx].values)
    iso_forest = IsolationForest(
        n_estimators=100,
        contamination=0.05,
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    iso_forest.fit(X_normal)
    logger.info("Isolation Forest training complete.")

    # ── Save artifacts ─────────────────────────────────────────────────────
    joblib.dump(rf_model,   MODELS_DIR / "rf_model.pkl")
    joblib.dump(scaler,     MODELS_DIR / "scaler.pkl")
    joblib.dump(le,         MODELS_DIR / "label_encoder.pkl")
    joblib.dump(iso_forest, MODELS_DIR / "iso_forest.pkl")

    metrics = {
        "model_name": "Random Forest + Isolation Forest",
        "model_version": "1.0.0",
        "trained_at": datetime.utcnow().isoformat() + "Z",
        "num_classes": len(THREAT_CLASSES),
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "features": 20,
        "accuracy": round(float(accuracy), 4),
        "precision": round(float(precision), 4),
        "recall": round(float(recall), 4),
        "f1_score": round(float(f1), 4),
        "classes": list(le.classes_),
    }

    with open(MODELS_DIR / "metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    logger.info(f"All model files saved to {MODELS_DIR}")
    logger.info("Training complete!")
    return metrics


if __name__ == "__main__":
    train_and_save()

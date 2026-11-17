
import os
from pathlib import Path
from contextlib import asynccontextmanager
from typing import Any, Dict

import faiss
import joblib
import numpy as np
import pandas as pd
import torch
import xgboost as xgb

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from transformers import AutoModel, AutoTokenizer


# =========================================================
# CONFIGURATION
# =========================================================

# Directory containing this main.py file
BASE_DIR = Path(__file__).resolve().parent

# Load artifacts from the same directory by default.
# ARTIFACT_DIR can optionally override this location.
ARTIFACT_DIR = Path(
    os.getenv("ARTIFACT_DIR", str(BASE_DIR))
).expanduser().resolve()

EMBEDDING_MODEL = os.getenv(
    "EMBEDDING_MODEL",
    "sentence-transformers/all-MiniLM-L6-v2"
)

K = 25

DEVICE = torch.device(
    "cuda" if torch.cuda.is_available() else "cpu"
)

# CORS configuration.
# Default "*" allows requests from any origin during development.
# For deployment, set CORS_ORIGINS to specific frontend origins.
cors_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "*").split(",")
    if origin.strip()
]


# =========================================================
# MODEL STATE
# =========================================================

state: Dict[str, Any] = {
    "ready": False,
    "error": None
}


# =========================================================
# REQUEST SCHEMA
# =========================================================

class PredictionRequest(BaseModel):
    model_config = ConfigDict(extra="allow")

    features: Dict[str, Any]


# =========================================================
# CLINICAL NOTE GENERATION
# =========================================================

def generate_clinical_note(row):
    return (
        f"Patient: {row.get('age', 'U')} yr old "
        f"{row.get('gender', 'U')}, "
        f"{row.get('state_patient', 'U')}. "
        f"Admit: {row.get('admit_type', 'U')}, "
        f"Ward: {row.get('ward_type', 'U')}. "
        f"Primary DX: {row.get('primary_diag_category', 'U')} "
        f"({row.get('primary_icd10', 'U')}). "
        f"Vitals/Labs: HbA1c {row.get('hba1c', 'U')}, "
        f"BP {row.get('systolic_bp', 'U')}, "
        f"Creatinine {row.get('creatinine', 'U')}. "
        f"Severity: {row.get('charlson_index', 'U')} Charlson, "
        f"{row.get('num_procedures', 'U')} procedures, "
        f"{row.get('los_days', 'U')} days stay. "
        f"History: {row.get('prev_admissions', 'U')} prior admissions, "
        f"{row.get('comorbidity_count', 'U')} comorbidities."
    )


# =========================================================
# LOAD EXISTING ARTIFACTS
# NO TRAINING
# =========================================================

def load_artifacts():

    required_files = [
        "impute_dict.joblib",
        "preprocessor.joblib",
        "rag_scaler.joblib",
        "xgb_model.json",
        "faiss_index.bin",
        "rag_y_train.npy"
    ]

    missing_files = [
        filename
        for filename in required_files
        if not (ARTIFACT_DIR / filename).is_file()
    ]

    if missing_files:
        raise FileNotFoundError(
            f"Missing artifacts in {ARTIFACT_DIR}: "
            f"{', '.join(missing_files)}. "
            "Place all exported artifact files beside main.py."
        )

    print(f"Loading artifacts from: {ARTIFACT_DIR}")

    # Load saved preprocessing objects
    impute_dict = joblib.load(
        ARTIFACT_DIR / "impute_dict.joblib"
    )

    preprocessor = joblib.load(
        ARTIFACT_DIR / "preprocessor.joblib"
    )

    rag_scaler = joblib.load(
        ARTIFACT_DIR / "rag_scaler.joblib"
    )

    # Load the already-trained XGBoost model
    model = xgb.XGBClassifier()

    model.load_model(
        str(ARTIFACT_DIR / "xgb_model.json")
    )

    # Load the existing FAISS index and training labels
    index = faiss.read_index(
        str(ARTIFACT_DIR / "faiss_index.bin")
    )

    labels = np.load(
        ARTIFACT_DIR / "rag_y_train.npy"
    )

    # Load the pretrained MiniLM encoder and tokenizer
    tokenizer = AutoTokenizer.from_pretrained(
        EMBEDDING_MODEL
    )

    encoder = AutoModel.from_pretrained(
        EMBEDDING_MODEL
    ).to(DEVICE)

    encoder.eval()

    print("All artifacts loaded successfully.")

    return {
        "impute_dict": impute_dict,
        "preprocessor": preprocessor,
        "rag_scaler": rag_scaler,
        "model": model,
        "index": index,
        "labels": labels,
        "tokenizer": tokenizer,
        "encoder": encoder
    }


# =========================================================
# FASTAPI LIFESPAN
# =========================================================

@asynccontextmanager
async def lifespan(app: FastAPI):

    try:
        loaded = load_artifacts()

        state.update(loaded)
        state["ready"] = True
        state["error"] = None

    except Exception as exc:
        state["ready"] = False
        state["error"] = str(exc)

        print(f"Artifact loading failed: {exc}")

    yield


# =========================================================
# FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="Readmission Prediction API",
    description=(
        "Inference API using previously trained artifacts. "
        "Returns predictions and generated clinical notes."
    ),
    version="1.2.0",
    lifespan=lifespan
)


# =========================================================
# CORS MIDDLEWARE
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=(
        ["*"] if cors_origins == ["*"]
        else cors_origins
    ),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"]
)


# =========================================================
# MINILM EMBEDDING
# =========================================================

def embed_note(note: str) -> np.ndarray:

    tokens = state["tokenizer"](
        [note],
        padding=True,
        truncation=True,
        max_length=128,
        return_tensors="pt"
    ).to(DEVICE)

    with torch.no_grad():

        output = state["encoder"](**tokens)

        mask = (
            tokens["attention_mask"]
            .unsqueeze(-1)
            .expand(output.last_hidden_state.size())
            .float()
        )

        pooled = (
            (output.last_hidden_state * mask).sum(1)
            / torch.clamp(mask.sum(1), min=1e-9)
        )

    return pooled.cpu().numpy().astype("float32")


# =========================================================
# MISSING VALUE CHECK
# =========================================================

def is_missing(value):

    if value is None:
        return True

    try:
        return bool(pd.isna(value))
    except (TypeError, ValueError):
        return False


# =========================================================
# PREDICTION PIPELINE
# =========================================================

def predict_one(features: Dict[str, Any]):

    if not state["ready"]:
        raise RuntimeError(
            state["error"] or "Model is not ready."
        )

    row = dict(features)

    # -----------------------------------------------------
    # Feature engineering
    # -----------------------------------------------------

    hba1c = row.get("hba1c")
    bp = row.get("systolic_bp")
    creatinine = row.get("creatinine")

    row["risk_high_hba1c"] = float(
        hba1c is not None and float(hba1c) > 6.5
    )

    row["risk_hypertension"] = float(
        bp is not None and float(bp) > 140
    )

    row["risk_abnormal_creatinine"] = float(
        creatinine is not None
        and (
            float(creatinine) > 1.2
            or float(creatinine) < 0.6
        )
    )

    total_cost = row.get("total_cost_inr")
    oop = row.get("out_of_pocket_inr")

    row["financial_burden_ratio"] = (
        float(oop) / (float(total_cost) + 1)
        if oop is not None and total_cost is not None
        else np.nan
    )

    los = row.get("los_days")
    prev = row.get("prev_admissions")

    row["utilization_intensity"] = (
        float(los) * (float(prev) + 1)
        if los is not None and prev is not None
        else np.nan
    )

    # -----------------------------------------------------
    # Generate the clinical note
    # -----------------------------------------------------

    note = generate_clinical_note(row)

    # -----------------------------------------------------
    # Generate MiniLM embedding
    # -----------------------------------------------------

    query = embed_note(note)

    faiss.normalize_L2(query)

    # -----------------------------------------------------
    # Retrieve nearest neighbors using FAISS
    # -----------------------------------------------------

    distances, ids = state["index"].search(query, K)

    valid = ids[0] >= 0

    neighbor_ids = ids[0][valid]
    neighbor_distances = distances[0][valid]

    if len(neighbor_ids) == 0:
        raise RuntimeError(
            "FAISS returned no valid neighbors."
        )

    # -----------------------------------------------------
    # Calculate RAG features
    # -----------------------------------------------------

    weights = 1.0 / (neighbor_distances + 1e-5)

    neighbor_labels = state["labels"][neighbor_ids]

    rag_score = float(
        np.sum(neighbor_labels * weights)
        / np.sum(weights)
    )

    rag_min_dist = float(neighbor_distances[0])

    row["rag_score"] = rag_score
    row["rag_min_dist"] = rag_min_dist

    # -----------------------------------------------------
    # Impute missing values
    # -----------------------------------------------------

    for column, value in state["impute_dict"].items():

        if column not in row or is_missing(row[column]):
            row[column] = value

    # -----------------------------------------------------
    # Match the training feature columns and their order
    # -----------------------------------------------------

    expected_columns = list(
        state["preprocessor"].feature_names_in_
    )

    missing_columns = [
        column
        for column in expected_columns
        if column not in row
    ]

    if missing_columns:
        raise ValueError(
            "Missing required features: "
            + ", ".join(missing_columns)
        )

    frame = pd.DataFrame(
        [
            {
                column: row[column]
                for column in expected_columns
            }
        ],
        columns=expected_columns
    )

    # Apply the saved preprocessing pipeline
    transformed = state["preprocessor"].transform(frame)

    # Run inference with the trained model
    probability = float(
        state["model"].predict_proba(transformed)[0, 1]
    )

    prediction = int(probability >= 0.5)

    # -----------------------------------------------------
    # Return prediction AND clinical note
    # -----------------------------------------------------

    return {
        "prediction": prediction,
        "prediction_label": (
            "readmitted_within_30_days"
            if prediction == 1
            else "not_readmitted_within_30_days"
        ),
        "probability_readmitted_30d": probability,
        "clinical_note": note,
        "rag_score": rag_score,
        "rag_min_dist": rag_min_dist,
        "model": "XGBoost with FAISS RAG features"
    }


# =========================================================
# ROOT ENDPOINT
# =========================================================

@app.get("/")
def root():

    return {
        "service": "Readmission Prediction API",
        "status": "running",
        "docs": "/docs",
        "health": "/health",
        "artifact_directory": str(ARTIFACT_DIR)
    }


# =========================================================
# HEALTH CHECK
# Tests actual inference, not just server availability
# =========================================================

@app.get("/health")
def health():

    if not state["ready"]:
        return {
            "status": "not_ready",
            "model_loaded": False,
            "artifact_directory": str(ARTIFACT_DIR),
            "detail": state["error"]
        }

    # Build a probe using training imputation values
    probe = dict(state["impute_dict"])

    probe.update({
        "age": probe.get("age", 60),
        "gender": probe.get("gender", "Unknown"),
        "state_patient": probe.get("state_patient", "Unknown"),
        "admit_type": probe.get("admit_type", "Emergency"),
        "ward_type": probe.get("ward_type", "General"),
        "primary_diag_category": probe.get(
            "primary_diag_category", "Unknown"
        ),
        "primary_icd10": probe.get("primary_icd10", "Unknown"),
        "hba1c": probe.get("hba1c", 5.5),
        "systolic_bp": probe.get("systolic_bp", 120),
        "creatinine": probe.get("creatinine", 1.0),
        "charlson_index": probe.get("charlson_index", 0),
        "num_procedures": probe.get("num_procedures", 0),
        "los_days": probe.get("los_days", 1),
        "prev_admissions": probe.get("prev_admissions", 0),
        "comorbidity_count": probe.get("comorbidity_count", 0),
        "total_cost_inr": probe.get("total_cost_inr", 1000),
        "out_of_pocket_inr": probe.get(
            "out_of_pocket_inr", 100
        )
    })

    try:
        result = predict_one(probe)

        return {
            "status": "ok",
            "model_loaded": True,
            "prediction_check": "passed",
            "test_prediction": result["prediction"],
            "test_probability": result[
                "probability_readmitted_30d"
            ]
        }

    except Exception as exc:

        return {
            "status": "degraded",
            "model_loaded": True,
            "prediction_check": "failed",
            "detail": str(exc)
        }


# =========================================================
# PREDICTION ENDPOINT
# =========================================================

@app.post("/predict")
def predict(request: PredictionRequest):

    if not state["ready"]:
        raise HTTPException(
            status_code=503,
            detail=state["error"] or "Model is not ready."
        )

    try:
        return predict_one(request.features)

    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc)
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Inference failed: {exc}"
        )

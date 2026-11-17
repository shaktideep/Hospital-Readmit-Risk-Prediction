# Readmission Prediction FastAPI

This service loads previously exported artifacts and performs inference only. It does not train any model.

## 1. Export artifacts from the training notebook

Run the notebook through its final export cell (Cell 9). It should create:

- `impute_dict.joblib`
- `preprocessor.joblib`
- `rag_scaler.joblib`
- `xgb_model.json`
- `faiss_index.bin`
- `rag_y_train.npy`

Create an `artifacts/` directory beside `main.py` and copy those files into it:

```text
readmission_fastapi/
├── main.py
├── requirements.txt
└── artifacts/
    ├── impute_dict.joblib
    ├── preprocessor.joblib
    ├── rag_scaler.joblib
    ├── xgb_model.json
    ├── faiss_index.bin
    └── rag_y_train.npy
```

The MiniLM encoder/tokenizer are loaded from Hugging Face (`sentence-transformers/all-MiniLM-L6-v2`) at startup; the first launch needs access to download them unless already cached. Set `EMBEDDING_MODEL` to a local model directory to use a local copy.

## 2. Install and run

Python 3.10 or 3.11 is a practical choice for ML dependency compatibility.

```bash
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Open `http://127.0.0.1:8000/docs` for interactive Swagger testing.

## 3. Endpoints

- `GET /health` — checks artifact/model load status and performs a real inference probe.
- `POST /predict` — accepts `{"features": { ... }}` and returns a binary prediction, readmission probability, and RAG features.

Example (replace values with actual feature values from a merged row in your notebook):

```json
{
  "features": {
    "age": 67,
    "gender": "Female",
    "state_patient": "Odisha",
    "admit_type": "Emergency",
    "ward_type": "General",
    "primary_diag_category": "Diabetes",
    "primary_icd10": "E11.9",
    "hba1c": 7.4,
    "systolic_bp": 148,
    "creatinine": 1.1,
    "charlson_index": 3,
    "num_procedures": 2,
    "los_days": 5,
    "prev_admissions": 2,
    "comorbidity_count": 4,
    "total_cost_inr": 25000,
    "out_of_pocket_inr": 4000
  }
}
```

**Important input contract:** the fitted preprocessor was trained on the notebook's merged and engineered tabular columns. `/predict` reports the exact missing column names with HTTP 422. Provide all columns listed by `preprocessor.feature_names_in_` from the same merged data pipeline, excluding IDs, dates, labels, and `clinical_note`; the API computes the five engineered fields and the two RAG fields. For production use, consider exporting the exact feature list as a JSON artifact during notebook training.

## Model export limitation

The notebook exports XGBoost and the FAISS/preprocessing artifacts. Its Transformer-with-RAG weights export is commented out, and the notebook's ensemble combines 70% XGBoost and 30% Transformer probabilities. Therefore this API uses the already-trained XGBoost model plus RAG features, rather than claiming to serve that ensemble. To serve the exact ensemble, update the notebook to save the trained `TransformerModel(with_rag=True).state_dict()` and its model config, then load those weights in the API.

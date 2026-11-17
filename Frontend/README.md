# CareSense — AI Clinical Intelligence

CareSense is an AI-powered clinical decision-support application that estimates the probability of hospital readmission within 30 days. It combines a Next.js frontend with a FastAPI backend using XGBoost and FAISS-based Retrieval-Augmented Generation (RAG) features derived from MiniLM embeddings.

## Features

- **30-day readmission prediction:** Displays the model's predicted probability and classification.
- **Clinical note extraction:** Extracts available patient features from clinical notes to help populate the form.
- **Patient intake form:** Collects demographic, admission, clinical, medical history, and financial features required by the model.
- **Prediction history:** Saves predictions in browser local storage.
- **Demo Mode:** Provides clearly labelled synthetic results for demonstration when the live backend is unavailable.
- **Model & API Status:** Checks backend connectivity and reports the model health response.
- **Responsive interface:** Provides a clinical dashboard for desktop and smaller screens.

## Technology Stack

**Frontend**
- Next.js
- React
- TypeScript
- Tailwind CSS

**Backend**
- FastAPI
- Python
- XGBoost
- FAISS
- MiniLM embeddings

## Project Structure

```text
CareSense/
├── frontend/
│   ├── app/
│   ├── components/
│   ├── config/
│   ├── hooks/
│   ├── lib/
│   ├── public/
│   ├── package.json
│   ├── package-lock.json
│   ├── .env.example
│   └── README.md
└── backend/
    ├── main.py
    ├── xgb_model.json
    ├── preprocessor.joblib
    ├── impute_dict.joblib
    ├── rag_scaler.joblib
    ├── faiss_index.bin
    ├── rag_y_train.npy
    └── README.md
```

The structure above is illustrative. Keep the actual filenames and folders from your project.

## Prerequisites

- Node.js and npm
- Python and pip
- The saved backend model artifacts
- All Python dependencies required by the backend

Model training is not required to run inference when the saved model artifacts are available.

## Local Development

### 1. Start the FastAPI backend

Open a terminal in the backend folder. Activate the Python environment containing the required backend dependencies, then run:

```powershell
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

If you use the existing Python environment from this project, run:

```powershell
C:\Users\mohan\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Keep the backend terminal open.

### 2. Configure the frontend

In the frontend root directory, create a file named `.env.local` beside `package.json`.

Add:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

This URL is for local development. Do not commit `.env.local` to a public repository.

The `.env.example` file should document the required variable without containing secrets.

### 3. Install frontend dependencies

Open another terminal in the frontend directory and run:

```powershell
npm install
```

### 4. Start the frontend

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Keep both the frontend and backend running while using the application.

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the FastAPI backend. Required for live API requests. |

The base URL must not include `/predict`, `/health`, or another endpoint path. The application appends the relevant endpoint.

After changing `.env.local`, restart the Next.js development server.

`NEXT_PUBLIC_` variables are exposed to the browser. Never store passwords, API secrets, or private credentials in them.

## FastAPI Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Returns API service information. |
| GET | `/health` | Reports backend and model health information. |
| POST | `/predict` | Generates a readmission prediction. |

The prediction request uses this outer structure:

```json
{
  "features": {
    "...": "..."
  }
}
```

The `features` object must contain the complete set of feature names and value types expected by the trained model's preprocessing pipeline.

The prediction response includes fields such as:

- `prediction`
- `prediction_label`
- `probability_readmitted_30d`
- `clinical_note`
- `rag_score`
- `rag_min_dist`
- `model`

The RAG-related fields are intermediate technical outputs. The backend uses retrieval-derived features internally as part of the prediction pipeline.

## Testing the Backend

Open the interactive API documentation:

[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

Check the health endpoint:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

To test a prediction, open `/predict` in Swagger UI, select **Try it out**, and provide a request with all required features.

Use values that match the actual training schema and preprocessing configuration. Do not assume that example categories or values are valid for the trained model without checking the backend's schema.

## CORS Configuration

For local development, FastAPI must allow the local frontend origin. Add or update CORS middleware in the existing FastAPI application:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

For a deployed frontend, add its actual origin to `allow_origins`.

## Demo Mode

Demo Mode uses synthetic results for demonstration. These results are not live predictions from the trained model and should remain clearly labelled as simulated.

For real predictions, configure the frontend to reach the running FastAPI backend.

## Prediction History

Prediction history is stored in the browser's `localStorage`.

- History remains available in the same browser and origin after refreshing the page.
- History is not automatically shared between different browsers, devices, or origins.
- Clearing browser site data can remove locally stored history.

## Deploying the Frontend

When deploying the frontend, configure `NEXT_PUBLIC_API_BASE_URL` with the actual public HTTPS URL of the deployed FastAPI backend.

A deployed website cannot access a backend running only at `127.0.0.1` on the developer's computer. The backend must be reachable from the browser, and its CORS configuration must allow the frontend origin.

Restart or redeploy the frontend after changing build-time environment variables.

## Important Notes

- The saved model artifacts must be present at the locations expected by the backend.
- The prediction request must match the trained model's feature schema.
- The frontend does not retrain the model.
- Demo Mode results are synthetic and must not be confused with live predictions.
- The displayed probability is a model estimate, not a clinically validated diagnosis or a substitute for professional clinical judgment.

## License

Add the license and usage terms applicable to your project before public distribution.
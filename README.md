# 🧠 Brain Tumor MRI Detector

An AI-powered web application that classifies brain MRI scans into four categories using deep learning, generates Grad-CAM visual explanations, and produces downloadable clinical PDF reports.

<br/>

## 📸 What it does

Upload a brain MRI image → the model predicts the tumor type → you get a heatmap showing exactly which region of the scan influenced the decision → download a full PDF report.

---

## 🎯 Tumor Classes

| Class | Description |
|---|---|
| **Glioma** | Fast-growing malignant tumor arising from glial cells |
| **Meningioma** | Usually benign tumor from the meninges membrane |
| **Pituitary** | Benign adenoma at the base of the brain |
| **No Tumor** | Normal brain scan — no tumor detected |

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER BROWSER                             │
│                                                                 │
│   React 19 + TypeScript + Tailwind CSS + Recharts              │
│   ┌──────────┐  ┌──────────┐  ┌─────────────┐  ┌──────────┐  │
│   │  Upload  │  │ HeatMap  │  │  Result     │  │ History  │  │
│   │   Page   │  │  Viewer  │  │  + Chart    │  │  Table   │  │
│   └──────────┘  └──────────┘  └─────────────┘  └──────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS (Axios + JWT Bearer)
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                     FASTAPI BACKEND                             │
│                                                                 │
│   /api/auth/login     →  JWT token                             │
│   /api/auth/register  →  new account                           │
│   /api/predict        →  MRI image → prediction + heatmap      │
│   /api/history        →  paginated scan records                │
│   /api/history/{id}   →  delete a scan                         │
│   /api/report/{id}    →  PDF report download                   │
│                                                                 │
│   ┌───────────────────────────────────────────────────────┐    │
│   │              AI PREDICTION PIPELINE                   │    │
│   │                                                       │    │
│   │  MRI Image                                            │    │
│   │      ↓                                                │    │
│   │  Preprocess  (resize 224×224, normalize [0,1])        │    │
│   │      ↓                                                │    │
│   │  ResNet50 base  (frozen ImageNet weights)             │    │
│   │      ↓                                                │    │
│   │  Custom head  (GAP → Dense 256 → Dropout → Dense 4)  │    │
│   │      ↓                                                │    │
│   │  Softmax → 4 class probabilities                      │    │
│   │      ↓                                                │    │
│   │  Grad-CAM  (conv5_block3_out gradients)               │    │
│   │      ↓                                                │    │
│   │  Heatmap overlay (JET colormap, 40/60 blend)          │    │
│   └───────────────────────────────────────────────────────┘    │
│                                                                 │
│   SQLite database  ·  Static file storage                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 How It Works — Step by Step

### 1. Authentication
- Register with name + email + password
- Backend hashes the password with bcrypt, issues a **JWT token** (24h expiry)
- Token stored in `localStorage` via Zustand — attached to every request as `Authorization: Bearer <token>`

### 2. Upload & Predict
1. User drags and drops a JPEG/PNG MRI scan (max 15 MB)
2. Image previewed in the browser before submission
3. File sent to `POST /api/predict` as `multipart/form-data`
4. Backend pipeline:
   - Validates file type, size, and dimensions (min 50×50 px)
   - Resizes to **224×224**, normalises to `[0, 1]`
   - Runs inference through **ResNet50** classification head
   - Picks the class with the highest softmax probability
   - Generates **Grad-CAM** heatmap by computing gradients of the predicted class score with respect to the last convolutional layer (`conv5_block3_out`)
   - Saves original image + heatmap PNG to disk
   - Saves scan record to SQLite database
5. Response returned to frontend:
   ```json
   {
     "class": "glioma",
     "scan_id": 42,
     "confidence": 0.9452,
     "probabilities": [0.9452, 0.0210, 0.0118, 0.0220],
     "heatmap_base64": "<base64 PNG>"
   }
   ```

### 3. Results Display
- **Result Card** — predicted class with color-coded badge (red = tumor, green = no tumor) and animated confidence bar
- **Heatmap Viewer** — side-by-side original MRI vs Grad-CAM overlay; click either panel to zoom full-screen
- **Probability Chart** — horizontal bar chart showing all 4 class probabilities with color coding
- **Interpretation Panel** — plain-English explanation of what the predicted class means clinically, with a medical disclaimer

### 4. PDF Report
- Click **Download PDF Report** → calls `GET /api/report/{scan_id}`
- Backend re-runs inference to get fresh probabilities, then builds a PDF using **ReportLab**:
  - Patient info table
  - Predicted class + confidence
  - Side-by-side original MRI and heatmap images
  - Probability bar chart (rendered via Matplotlib)
  - Medical disclaimer footer
- PDF streamed directly to the browser as a file download

### 5. Scan History
- `GET /api/history?page=1&size=10` — paginated, most recent first
- Table shows: date/time, class badge, confidence bar, thumbnail
- Each row has **View** (reopens result on upload page), **PDF** (download report), **Delete** (removes scan and artifacts)

---

## 🧬 Model Details

| Property | Value |
|---|---|
| Architecture | ResNet50 (transfer learning) |
| Pretrained on | ImageNet |
| Input shape | 224 × 224 × 3 |
| Output | 4-class softmax |
| Training phases | Phase 1: head only (10 epochs) · Phase 2: top-30 layers unfrozen (20 epochs) |
| Optimizer | Adam (lr 1e-3 → 1e-5) |
| Visual explanation | Grad-CAM on `conv5_block3_out` |

---

## 🛠️ Tech Stack

### Frontend
| | |
|---|---|
| Framework | React 19 + TypeScript |
| Build tool | Vite 8 |
| Styling | Tailwind CSS 3 |
| Charts | Recharts |
| HTTP client | Axios |
| State management | Zustand |
| Forms | React Hook Form |
| Icons | Lucide React |
| Toasts | React Hot Toast |
| Routing | React Router DOM v6 |

### Backend
| | |
|---|---|
| Framework | FastAPI |
| Runtime | Python 3.11 |
| ML | TensorFlow 2.x / Keras |
| Image processing | OpenCV + Pillow |
| Database ORM | SQLAlchemy (SQLite) |
| Auth | bcrypt + PyJWT |
| PDF generation | ReportLab + Matplotlib |
| Server | Uvicorn |

---

## 📁 Project Structure

```
Brain_Tumor_Project/
│
├── app/                          # FastAPI backend
│   ├── main.py                   # App entry point, CORS, lifespan
│   ├── config.py                 # Env-driven config (JWT, DB, paths)
│   ├── models.py                 # SQLAlchemy: User, Scan
│   ├── schemas.py                # Pydantic request/response models
│   ├── security.py               # JWT creation and verification
│   ├── database.py               # DB engine + session
│   ├── model.py                  # ResNet50 architecture
│   ├── report.py                 # PDF generation (ReportLab)
│   └── routes/
│       ├── auth.py               # /api/auth/register, /api/auth/login
│       ├── predict.py            # /api/predict
│       ├── history.py            # /api/history, /api/history/{id}
│       └── report.py             # /api/report/{id}
│   └── utils/
│       ├── preprocess.py         # Image normalisation pipeline
│       ├── gradcam.py            # Grad-CAM implementation
│       └── data_loader.py        # Training data generators
│
├── models/
│   └── brain_tumor_model.h5      # Trained weights (Git LFS, 206 MB)
│
├── src/                          # React frontend
│   ├── api/
│   │   └── client.ts             # Axios instance + all API calls
│   ├── components/
│   │   ├── Navbar.tsx            # Top bar + sign-out overlay
│   │   ├── Sidebar.tsx           # Navigation sidebar
│   │   ├── HeatmapViewer.tsx     # Two-panel MRI / heatmap viewer
│   │   ├── ResultCard.tsx        # Prediction result + progress bar
│   │   ├── ProbabilityChart.tsx  # Recharts horizontal bar chart
│   │   ├── InterpretationPanel.tsx # Clinical description + disclaimer
│   │   └── ScanHistoryTable.tsx  # Paginated history table
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Upload.tsx            # Main prediction page
│   │   └── History.tsx           # Scan history page
│   ├── store/
│   │   └── authStore.ts          # Zustand auth state
│   └── types.ts                  # Shared TypeScript types
│
├── Dockerfile.backend            # Backend Docker image
├── Dockerfile.frontend           # Nginx + React static build
├── docker-compose.yml            # Full stack local deployment
├── nginx.conf                    # Nginx config (SPA + API proxy)
├── render.yaml                   # Render.com deployment blueprint
├── vercel.json                   # Vercel frontend deployment config
├── .vercelignore                 # Keeps Python files out of Vercel build
├── .env.example                  # Environment variable template
└── requirements.txt              # Python dependencies
```

---

## 🚀 Local Development

### Prerequisites
- Python 3.11+
- Node.js 20+

### Backend

```bash
# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
source .venv/bin/activate        # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env

# Start backend (runs on http://localhost:8000)
uvicorn app.main:app --reload
```

### Frontend

```bash
# Install dependencies
npm install

# Start dev server (runs on http://localhost:5173)
npm run dev
```

API docs available at **http://localhost:8000/docs**

---

## ☁️ Deployment

### Frontend → Vercel
1. Connect your GitHub repo at [vercel.com/new](https://vercel.com/new)
2. Add environment variable: `VITE_API_URL` = your backend URL
3. Deploy — Vercel reads `vercel.json` automatically

### Backend → Render
1. Go to [render.com](https://render.com) → New → Blueprint
2. Connect your GitHub repo — Render reads `render.yaml`
3. Copy the backend URL and set it as `VITE_API_URL` in Vercel

### Full stack → Docker (VPS)
```bash
cp .env.example .env
# Set JWT_SECRET_KEY to a strong random string
docker compose up --build -d
```

---

## 🔐 Environment Variables

| Variable | Where | Description |
|---|---|---|
| `VITE_API_URL` | Frontend | Backend URL (e.g. `https://api.yourdomain.com`) |
| `JWT_SECRET_KEY` | Backend | Secret for signing JWT tokens |
| `DATABASE_URL` | Backend | SQLite path or PostgreSQL URL |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Backend | Token lifetime (default: 1440 = 24h) |
| `ALLOWED_ORIGINS` | Backend | Comma-separated CORS origins |

Generate a secure JWT secret:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## ⚠️ Medical Disclaimer

This application is for **educational and research purposes only**. AI predictions do not constitute medical advice and must not be used as a substitute for diagnosis by a qualified clinician. Always consult a radiologist or oncologist before making any clinical decisions.

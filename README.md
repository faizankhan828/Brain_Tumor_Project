# Brain Tumor MRI Detector

AI-powered MRI classification using ResNet50 + Grad-CAM. Classifies brain tumors into 4 classes: **glioma**, **meningioma**, **pituitary**, **no tumor**.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 · TypeScript · Vite · Tailwind CSS · Recharts |
| Backend | FastAPI · Python 3.11 · TensorFlow 2.x · SQLAlchemy |
| Model | ResNet50 (transfer learning) + Grad-CAM visualisation |
| Database | SQLite (default) · PostgreSQL (production) |
| Serving | Uvicorn · Nginx |

---

## Local Development

### Prerequisites
- Python 3.11+
- Node.js 20+
- Git

### 1. Clone and set up environment

```bash
git clone https://github.com/faizankhan828/Brain_Tumor_Project.git
cd Brain_Tumor_Project

# Pull the model weights (stored via Git LFS, 206 MB)
git lfs pull

# Copy env file
cp .env.example .env
# Edit .env with your values
```

### 2. Backend

```bash
# Create virtual environment
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate
# Activate (Mac/Linux)
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend runs at → **http://localhost:8000**  
API docs → **http://localhost:8000/docs**

### 3. Frontend

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Frontend runs at → **http://localhost:5173**

---

## Deployment

### Option A — Docker Compose (VPS / Self-hosted) ⭐ Recommended

The easiest way to deploy both services together on any server that has Docker.

#### Requirements
- A Linux VPS (Ubuntu 22.04+ recommended) with Docker + Docker Compose installed
- At least **2 GB RAM** (TensorFlow needs ~1.5 GB at inference time)
- Port 80 open in firewall

#### Steps

```bash
# 1. SSH into your server
ssh user@your-server-ip

# 2. Clone the repo
git clone https://github.com/your-username/brain-tumor-detector.git
cd brain-tumor-detector

# 3. Create your .env file
cp .env.example .env
nano .env
# Set JWT_SECRET_KEY to a strong random string:
#   python -c "import secrets; print(secrets.token_hex(32))"
# Set ALLOWED_ORIGINS to your domain:
#   ALLOWED_ORIGINS=https://yourdomain.com

# 4. Build and start
docker compose up --build -d

# 5. Check logs
docker compose logs -f
```

App runs at → **http://your-server-ip**  
Backend API at → **http://your-server-ip:8000**

#### Updating after code changes

```bash
git pull
docker compose up --build -d
```

#### With a custom domain + SSL (optional)

Install Certbot and use Nginx as a reverse proxy in front of the Docker containers:

```bash
# On the host (not inside Docker)
sudo apt install nginx certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

Point your domain DNS A record to the server IP.

---

### Option B — Render.com (Free / Managed)

Render hosts both services separately. The `render.yaml` blueprint automates everything.

> **Note:** TF requires ~1 GB RAM. Render's free tier (512 MB) will crash.  
> Use the **Starter plan** (~$7/month) for the backend.

#### Steps

1. Push your code to GitHub (make sure `models/brain_tumor_model.h5` is in the repo or use a large-file strategy — see below)
2. Go to [https://dashboard.render.com](https://dashboard.render.com)
3. Click **New** → **Blueprint**
4. Connect your GitHub repo — Render will pull the model via Git LFS automatically
5. Render reads `render.yaml` and creates both services automatically
6. After the **backend** deploys, copy its URL (e.g. `https://btmd-backend.onrender.com`)
7. Go to the **frontend** service environment variables and set:
   - `VITE_API_URL` = `https://btmd-backend.onrender.com`
8. Trigger a redeploy of the frontend

> **Model file (206 MB) is stored with Git LFS.**  
> When you clone the repo, run `git lfs pull` to download the model weights.  
> Make sure Git LFS is installed: https://git-lfs.github.com/

---

### Option C — Vercel (Frontend) + Render (Backend)

Best option for fast frontend deployments with a separate managed backend.

#### Frontend → Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# From project root
vercel

# Follow prompts:
# - Link to your Vercel account
# - Set VITE_API_URL = https://your-backend.onrender.com
```

Or connect your GitHub repo directly at [https://vercel.com/new](https://vercel.com/new) — Vercel auto-detects Vite and uses `vercel.json`.

#### Backend → Render

Follow Option B steps for the backend only (deploy just the `btmd-backend` service).

---

### Option D — Railway

```bash
# Install Railway CLI
npm i -g @railway/cli
railway login

# Deploy backend
railway up --dockerfile Dockerfile.backend

# Set environment variables in Railway dashboard:
#   JWT_SECRET_KEY, DATABASE_URL, ALLOWED_ORIGINS

# Deploy frontend separately or use Vercel
```

---

## Environment Variables Reference

### Backend

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET_KEY` | **Yes** | `change-me-in-production` | JWT signing secret — use a 64-char random string |
| `DATABASE_URL` | No | `sqlite:///./brain_tumor.db` | SQLite or PostgreSQL connection URL |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `1440` | JWT token lifetime (minutes) |
| `ALLOWED_ORIGINS` | No | `*` | Comma-separated CORS origins (e.g. `https://yourapp.com`) |
| `STATIC_DIR` | No | `./static` | Path for uploaded images and heatmaps |

### Frontend

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | **Yes** (prod) | `http://localhost:8000` | Full URL of the deployed backend |

---

## Project Structure

```
brain-tumor-detector/
├── app/                    # FastAPI backend
│   ├── routes/             # Auth, predict, history, report
│   ├── utils/              # Preprocessing, Grad-CAM, data loaders
│   ├── main.py             # App entry point + lifespan
│   ├── config.py           # Env-driven configuration
│   ├── models.py           # SQLAlchemy ORM models
│   └── schemas.py          # Pydantic request/response schemas
├── models/                 # Trained model weights (.h5)
├── src/                    # React frontend
│   ├── api/                # Axios client
│   ├── components/         # UI components
│   ├── pages/              # Upload, History, Login, Register
│   └── store/              # Zustand auth store
├── static/                 # Runtime uploads and heatmaps (gitignored)
├── Dockerfile.backend      # Backend Docker image
├── Dockerfile.frontend     # Frontend Docker image (Nginx)
├── docker-compose.yml      # Local production stack
├── nginx.conf              # Nginx config for frontend container
├── render.yaml             # Render.com blueprint
├── vercel.json             # Vercel frontend config
└── requirements.txt        # Python dependencies
```

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | No | Health check |
| POST | `/api/auth/register` | No | Register user |
| POST | `/api/auth/login` | No | Login → JWT |
| POST | `/api/predict` | Yes | Upload MRI → prediction + Grad-CAM |
| GET | `/api/history` | Yes | Paginated scan history |
| DELETE | `/api/history/{id}` | Yes | Delete a scan |
| GET | `/api/report/{id}` | Yes | Download PDF report |

Full interactive docs at `/docs` (Swagger UI) when the backend is running.

---

## Generating a Secure JWT Secret

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Copy the output and set it as `JWT_SECRET_KEY` in your `.env` or hosting dashboard.

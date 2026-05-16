#!/usr/bin/env bash
set -e

echo ""
echo "══════════════════════════════════════════"
echo "  DisasterRoute — Render Build"
echo "══════════════════════════════════════════"

# ── 1. Frontend ───────────────────────────────
echo ""
echo "[1/3] Frontend build ediliyor..."
cd frontend
npm ci --prefer-offline 2>/dev/null || npm install
# VITE_API_URL boş bırakılıyor → aynı origin'den serve edilecek
VITE_API_URL="" npm run build
cd ..
echo "      ✓ frontend/dist hazır"

# ── 2. Backend bağımlılıkları ─────────────────
echo ""
echo "[2/3] Backend bağımlılıkları kuruluyor..."
pip install -r backend/requirements.txt -q
echo "      ✓ pip install tamamlandı"

# ── 3. Sentence-Transformers model önbelleği ──
echo ""
echo "[3/3] AI modeli indiriliyor (all-MiniLM-L6-v2)..."
CACHE_DIR="/opt/render/project/src/.model_cache"
mkdir -p "$CACHE_DIR" 2>/dev/null || true

python - <<'PYEOF'
import os, sys
cache = os.environ.get("SENTENCE_TRANSFORMERS_HOME", "/opt/render/project/src/.model_cache")
os.makedirs(cache, exist_ok=True)
try:
    from sentence_transformers import SentenceTransformer
    SentenceTransformer("all-MiniLM-L6-v2", cache_folder=cache)
    print("      ✓ Model hazır:", cache)
except Exception as e:
    print("      ! Model preload atlandı:", e, file=sys.stderr)
PYEOF

echo ""
echo "══════════════════════════════════════════"
echo "  Build tamamlandı ✅"
echo "══════════════════════════════════════════"

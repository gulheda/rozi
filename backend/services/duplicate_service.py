import json
import numpy as np
import os
from typing import Optional

THRESHOLD = float(os.getenv("DUPLICATE_THRESHOLD", "0.85"))

_model = None


def get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        cache = os.getenv("SENTENCE_TRANSFORMERS_HOME", None)
        _model = SentenceTransformer("all-MiniLM-L6-v2", cache_folder=cache)
    return _model


def metni_hazirla(adres: str, ihtiyac: str, kisi_sayisi: str) -> str:
    return f"{adres} {ihtiyac} {kisi_sayisi}".lower().strip()


def embedding_uret(metin: str) -> list[float]:
    model = get_model()
    emb = model.encode(metin, normalize_embeddings=True)
    return emb.tolist()


def cosine_similarity(a: list[float], b: list[float]) -> float:
    va = np.array(a)
    vb = np.array(b)
    return float(np.dot(va, vb))  # normalize edilmiş vektörler için dot product = cosine


def duplicate_bul(
    yeni_embedding: list[float],
    mevcut_ihbarlar: list[dict],  # {"id": int, "embedding_json": str}
) -> Optional[int]:
    """
    Yeni ihbarın embeddingi ile mevcut ihbarları karşılaştır.
    THRESHOLD üzerinde benzerlik varsa o ihbarın id'sini döndür.
    """
    for ihbar in mevcut_ihbarlar:
        if not ihbar.get("embedding_json"):
            continue
        try:
            mevcut_emb = json.loads(ihbar["embedding_json"])
            similarity = cosine_similarity(yeni_embedding, mevcut_emb)
            if similarity >= THRESHOLD:
                return ihbar["id"]
        except Exception:
            continue
    return None

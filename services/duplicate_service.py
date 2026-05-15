from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

model = SentenceTransformer('all-MiniLM-L6-v2')

def check_duplicate(yeni_ihbar: str, mevcut_ihbarlar: list, threshold: float = 0.85):
    if not mevcut_ihbarlar:
        return None

    yeni_embedding = model.encode([yeni_ihbar])
    mevcut_textler = [i["text"] for i in mevcut_ihbarlar]
    mevcut_embeddings = model.encode(mevcut_textler)
    similarities = cosine_similarity(yeni_embedding, mevcut_embeddings)[0]
    max_idx = np.argmax(similarities)
    max_score = similarities[max_idx]

    if max_score >= threshold:
        return mevcut_ihbarlar[max_idx]["id"]
    return None


def calculate_guven_skoru(ses_var: bool, fotograf_var: bool, adres: str, kisi_sayisi: str, benzer_ihbar_var: bool):
    skor = 0
    if ses_var:
        skor += 25
    if fotograf_var:
        skor += 30
    if len(adres) > 20:
        skor += 20
    if kisi_sayisi and kisi_sayisi != "bilinmiyor":
        skor += 15
    if benzer_ihbar_var:
        skor += 10
    return min(skor, 100)
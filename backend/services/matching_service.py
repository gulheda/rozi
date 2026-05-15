import math
from typing import Optional


IHTIYAC_KAYNAK_MAP = {
    "vinç": ["tirci"],
    "tirci": ["tirci"],
    "ambulans": ["doktor", "hemsire"],
    "doktor": ["doktor"],
    "hemsire": ["hemsire"],
    "ilaç": ["doktor", "hemsire", "gonullu"],
    "gönüllü": ["gonullu"],
    "gonullu": ["gonullu"],
    "diger": ["gonullu", "doktor", "tirci"],
    "bilinmiyor": ["gonullu", "doktor", "tirci"],
}


def mesafe_hesapla(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Haversine formülü ile km cinsinden mesafe."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


def kaynak_sirala(
    ihbar_ihtiyac: str,
    ihbar_lat: Optional[float],
    ihbar_lng: Optional[float],
    kaynaklar: list[dict],
) -> list[dict]:
    """
    Müsait kaynakları ihtiyaç tipine göre filtrele, mesafeye göre sırala.
    """
    uygun_tipler = IHTIYAC_KAYNAK_MAP.get(ihbar_ihtiyac.lower(), ["gonullu"])

    uygun = [k for k in kaynaklar if k["musait"] and k["tip"] in uygun_tipler]

    if ihbar_lat and ihbar_lng:
        def skor(k):
            if k.get("lat") and k.get("lng"):
                return mesafe_hesapla(ihbar_lat, ihbar_lng, k["lat"], k["lng"])
            return 9999

        uygun.sort(key=skor)

    return uygun[:5]  # En yakın 5 kaynak

import math

def calculate_distance(lat1, lng1, lat2, lng2):
    """İki koordinat arası mesafeyi km cinsinden hesaplar."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c


def find_best_match(ihbar, kaynaklar):
    """
    ihbar: ihtiyac, lat, lng alanları olan dict
    kaynaklar: liste
    """
    
    ihtiyac_kaynak_map = {
        "vinç": ["tırcı", "inşaat"],
        "ambulans": ["doktor", "hemşire", "sağlık"],
        "ilaç": ["doktor", "hemşire", "eczacı"],
        "gönüllü": ["gönüllü", "tırcı", "doktor"]
    }

    uygun_tipler = ihtiyac_kaynak_map.get(ihbar.get("ihtiyac", "gönüllü"), ["gönüllü"])
    
    musait_kaynaklar = [
        k for k in kaynaklar 
        if k.musait and any(tip in k.tip.lower() for tip in uygun_tipler)
    ]

    if not musait_kaynaklar:
        musait_kaynaklar = [k for k in kaynaklar if k.musait]

    if not musait_kaynaklar:
        return None

    if ihbar.get("lat") and ihbar.get("lng"):
        en_yakin = min(
            musait_kaynaklar,
            key=lambda k: calculate_distance(
                ihbar["lat"], ihbar["lng"],
                k.lat or 0, k.lng or 0
            )
        )
        return en_yakin

    return musait_kaynaklar[0]
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class IhbarCreate(BaseModel):
    adres: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    ses_var: bool = False
    kisi_sayisi: str
    ihtiyac: str

class IhbarResponse(BaseModel):
    id: int
    adres: str
    lat: Optional[float]
    lng: Optional[float]
    ses_var: bool
    kisi_sayisi: str
    ihtiyac: str
    fotograf_url: Optional[str]
    oncelik_skoru: int
    guven_skoru: int
    durum: str
    duplicate_id: Optional[int]
    ozet: Optional[str]
    olusturulma: datetime

    class Config:
        from_attributes = True

class IhbarDurumGuncelle(BaseModel):
    durum: str

class KaynakCreate(BaseModel):
    isim: str
    tip: str
    ekipman: str
    lat: Optional[float] = None
    lng: Optional[float] = None

class KaynakResponse(BaseModel):
    id: int
    isim: str
    tip: str
    ekipman: str
    lat: Optional[float]
    lng: Optional[float]
    musait: bool

    class Config:
        from_attributes = True
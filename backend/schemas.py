from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class IhbarCreate(BaseModel):
    adres: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    ses_var: bool = False
    kisi_sayisi: str = "bilinmiyor"
    ihtiyac: str = "bilinmiyor"


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

    model_config = {"from_attributes": True}


class IhbarDurumGuncelle(BaseModel):
    durum: str = Field(..., pattern="^(bekliyor|yolda|tamam)$")


class KaynakCreate(BaseModel):
    isim: str
    tip: str = Field(..., pattern="^(arama_kurtarma|ambulans|vinc|kepce|itfaiye|tirci|ilac|gonullu|doktor|hemsire|diger)$")
    ekipman: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    telefon: Optional[str] = None
    musait: Optional[bool] = True


class KaynakResponse(BaseModel):
    id: int
    isim: str
    tip: str
    ekipman: Optional[str]
    lat: Optional[float]
    lng: Optional[float]
    musait: bool
    telefon: Optional[str]
    olusturulma: datetime

    model_config = {"from_attributes": True}


class AtamaCreate(BaseModel):
    kaynak_id: int
    notlar: Optional[str] = None


class AtamaResponse(BaseModel):
    id: int
    ihbar_id: int
    kaynak_id: int
    atama_zamani: datetime
    notlar: Optional[str]

    model_config = {"from_attributes": True}


class EslestirmeResponse(BaseModel):
    ihbar_id: int
    onerilen_kaynaklar: list[KaynakResponse]
    aciklama: str

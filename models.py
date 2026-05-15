from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime
from sqlalchemy.sql import func
from database import Base

class Ihbar(Base):
    __tablename__ = "ihbarlar"

    id = Column(Integer, primary_key=True, index=True)
    adres = Column(String)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    ses_var = Column(Boolean, default=False)
    kisi_sayisi = Column(String)
    ihtiyac = Column(String)
    fotograf_url = Column(String, nullable=True)
    oncelik_skoru = Column(Integer, default=0)
    guven_skoru = Column(Integer, default=0)
    durum = Column(String, default="bekliyor")
    duplicate_id = Column(Integer, nullable=True)
    ozet = Column(String, nullable=True)
    olusturulma = Column(DateTime, default=func.now())


class Kaynak(Base):
    __tablename__ = "kaynaklar"

    id = Column(Integer, primary_key=True, index=True)
    isim = Column(String)
    tip = Column(String)
    ekipman = Column(String)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    musait = Column(Boolean, default=True)
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Ihbar(Base):
    __tablename__ = "ihbarlar"

    id = Column(Integer, primary_key=True, index=True)
    adres = Column(String(500), nullable=False)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    ses_var = Column(Boolean, default=False)
    kisi_sayisi = Column(String(20), default="bilinmiyor")
    ihtiyac = Column(String(100), default="bilinmiyor")
    fotograf_url = Column(String(500), nullable=True)
    oncelik_skoru = Column(Integer, default=0)
    guven_skoru = Column(Integer, default=0)
    durum = Column(String(50), default="bekliyor")  # bekliyor / yolda / tamam
    duplicate_id = Column(Integer, ForeignKey("ihbarlar.id"), nullable=True)
    ozet = Column(Text, nullable=True)
    embedding_json = Column(Text, nullable=True)  # JSON string olarak sakla
    olusturulma = Column(DateTime, default=datetime.utcnow)

    duplicates = relationship("Ihbar", backref="original", foreign_keys=[duplicate_id], remote_side=[id])
    atamalar = relationship("Atama", back_populates="ihbar")


class Kaynak(Base):
    __tablename__ = "kaynaklar"

    id = Column(Integer, primary_key=True, index=True)
    isim = Column(String(200), nullable=False)
    tip = Column(String(100), nullable=False)  # tirci / doktor / hemsire / gonullu
    ekipman = Column(String(200), nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    musait = Column(Boolean, default=True)
    telefon = Column(String(20), nullable=True)
    olusturulma = Column(DateTime, default=datetime.utcnow)

    atamalar = relationship("Atama", back_populates="kaynak")


class Atama(Base):
    __tablename__ = "atamalar"

    id = Column(Integer, primary_key=True, index=True)
    ihbar_id = Column(Integer, ForeignKey("ihbarlar.id"), nullable=False)
    kaynak_id = Column(Integer, ForeignKey("kaynaklar.id"), nullable=False)
    atama_zamani = Column(DateTime, default=datetime.utcnow)
    notlar = Column(Text, nullable=True)

    ihbar = relationship("Ihbar", back_populates="atamalar")
    kaynak = relationship("Kaynak", back_populates="atamalar")

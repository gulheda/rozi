from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import Kaynak
from schemas import KaynakCreate, KaynakResponse

router = APIRouter(prefix="/kaynak", tags=["kaynak"])


@router.post("/", response_model=KaynakResponse)
def kaynak_olustur(kaynak: KaynakCreate, db: Session = Depends(get_db)):
    yeni_kaynak = Kaynak(**kaynak.dict())
    db.add(yeni_kaynak)
    db.commit()
    db.refresh(yeni_kaynak)
    return yeni_kaynak


@router.get("/", response_model=list[KaynakResponse])
def kaynaklari_listele(db: Session = Depends(get_db)):
    return db.query(Kaynak).filter(Kaynak.musait == True).all()


@router.put("/{kaynak_id}/musait")
def musaitlik_guncelle(kaynak_id: int, musait: bool, db: Session = Depends(get_db)):
    kaynak = db.query(Kaynak).filter(Kaynak.id == kaynak_id).first()
    kaynak.musait = musait
    db.commit()
    return {"mesaj": "Güncellendi"}
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import Kaynak
from schemas import KaynakCreate, KaynakResponse

router = APIRouter(prefix="/kaynak", tags=["Kaynak"])


@router.post("", response_model=KaynakResponse)
async def kaynak_olustur(body: KaynakCreate, db: AsyncSession = Depends(get_db)):
    kaynak = Kaynak(**body.model_dump())
    db.add(kaynak)
    await db.commit()
    await db.refresh(kaynak)
    return kaynak


@router.get("lar", response_model=List[KaynakResponse])
async def kaynaklari_listele(
    musait: Optional[bool] = None,
    tip: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(Kaynak).order_by(Kaynak.olusturulma.desc())
    if musait is not None:
        q = q.where(Kaynak.musait == musait)
    if tip:
        q = q.where(Kaynak.tip == tip)
    result = await db.execute(q)
    return result.scalars().all()


@router.put("/{kaynak_id}/musaitlik", response_model=KaynakResponse)
async def musaitlik_guncelle(
    kaynak_id: int,
    musait: bool,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Kaynak).where(Kaynak.id == kaynak_id))
    kaynak = result.scalar_one_or_none()
    if not kaynak:
        raise HTTPException(status_code=404, detail="Kaynak bulunamadı")
    kaynak.musait = musait
    await db.commit()
    await db.refresh(kaynak)
    return kaynak

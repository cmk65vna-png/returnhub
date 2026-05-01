from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from models.database import get_db, ReturnOrder
from typing import Optional
from datetime import datetime, timezone, timedelta

router = APIRouter()

@router.get("/")
def list_returns(
    platform: Optional[str] = None,
    reconcile_status: Optional[str] = None,
    platform_status: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    q = db.query(ReturnOrder)
    if platform and platform != "all":
        q = q.filter(ReturnOrder.platform == platform)
    if reconcile_status and reconcile_status != "all":
        q = q.filter(ReturnOrder.reconcile_status == reconcile_status)
    if platform_status and platform_status != "all":
        q = q.filter(ReturnOrder.platform_status == platform_status)
    if search:
        q = q.filter(
            ReturnOrder.order_id.contains(search) |
            ReturnOrder.product_name.contains(search) |
            ReturnOrder.tracking_code.contains(search)
        )
    total = q.count()
    items = q.order_by(ReturnOrder.created_at.desc()).offset(skip).limit(limit).all()
    return {"total": total, "items": [_fmt(r) for r in items]}

@router.get("/{order_id}")
def get_return(order_id: str, db: Session = Depends(get_db)):
    r = db.query(ReturnOrder).filter(ReturnOrder.order_id == order_id).first()
    if not r:
        return {"error": "not found"}
    return _fmt(r)

@router.put("/{order_id}/warehouse")
def update_warehouse(order_id: str, body: dict, db: Session = Depends(get_db)):
    r = db.query(ReturnOrder).filter(ReturnOrder.order_id == order_id).first()
    if not r:
        return {"error": "not found"}
    r.warehouse_status = body.get("warehouse_status", r.warehouse_status)
    r.notes = body.get("notes", r.notes)
    if body.get("warehouse_status") in ["received", "damaged"]:
        r.received_date = datetime.now(timezone(timedelta(hours=7)))
    _auto_reconcile(r)
    db.commit()
    return _fmt(r)

@router.put("/{order_id}/reconcile")
def manual_reconcile(order_id: str, body: dict, db: Session = Depends(get_db)):
    r = db.query(ReturnOrder).filter(ReturnOrder.order_id == order_id).first()
    if not r:
        return {"error": "not found"}
    r.reconcile_status = body.get("reconcile_status", r.reconcile_status)
    r.notes = body.get("notes", r.notes)
    db.commit()
    return _fmt(r)

def _auto_reconcile(r: ReturnOrder):
    if r.platform_status == "completed" and r.warehouse_status == "received":
        r.reconcile_status = "matched"
    elif r.platform_status == "returning" and r.warehouse_status == "received":
        r.reconcile_status = "mismatch"
    elif r.platform_status == "completed" and r.warehouse_status == "not_received":
        r.reconcile_status = "mismatch"
    else:
        r.reconcile_status = "pending"

def _fmt(r: ReturnOrder):
    return {
        "order_id": r.order_id,
        "platform": r.platform,
        "product_name": r.product_name,
        "sku": r.sku,
        "quantity": r.quantity,
        "value": r.value,
        "platform_status": r.platform_status,
        "warehouse_status": r.warehouse_status,
        "reconcile_status": r.reconcile_status,
        "shipper": r.shipper,
        "tracking_code": r.tracking_code,
        "return_date": r.return_date.strftime("%d/%m/%Y") if r.return_date else "",
        "received_date": r.received_date.strftime("%d/%m/%Y %H:%M") if r.received_date else None,
        "notes": r.notes,
    }

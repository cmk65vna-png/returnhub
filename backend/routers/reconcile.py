from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models.database import get_db, ReturnOrder

router = APIRouter()

@router.post("/run")
def run_reconcile(db: Session = Depends(get_db)):
    orders = db.query(ReturnOrder).all()
    matched = mismatch = pending = 0
    for r in orders:
        if r.platform_status == "completed" and r.warehouse_status == "received":
            r.reconcile_status = "matched"; matched += 1
        elif r.platform_status in ["completed","returning"] and r.warehouse_status in ["received","damaged"] and not (r.platform_status == "completed" and r.warehouse_status == "received"):
            r.reconcile_status = "mismatch"; mismatch += 1
        else:
            r.reconcile_status = "pending"; pending += 1
    db.commit()
    return {"matched": matched, "mismatch": mismatch, "pending": pending, "total": len(orders)}

@router.get("/summary")
def reconcile_summary(db: Session = Depends(get_db)):
    total = db.query(ReturnOrder).count()
    matched = db.query(ReturnOrder).filter(ReturnOrder.reconcile_status == "matched").count()
    mismatch = db.query(ReturnOrder).filter(ReturnOrder.reconcile_status == "mismatch").count()
    pending = db.query(ReturnOrder).filter(ReturnOrder.reconcile_status == "pending").count()
    return {
        "total": total,
        "matched": matched,
        "mismatch": mismatch,
        "pending": pending,
        "matched_pct": round(matched/total*100) if total else 0,
        "mismatch_pct": round(mismatch/total*100) if total else 0,
        "pending_pct": round(pending/total*100) if total else 0,
    }

@router.get("/mismatches")
def get_mismatches(db: Session = Depends(get_db)):
    items = db.query(ReturnOrder).filter(ReturnOrder.reconcile_status == "mismatch").all()
    result = []
    for r in items:
        reason = ""
        if r.platform_status == "returning" and r.warehouse_status == "received":
            reason = "Sàn chưa cập nhật — kho đã nhận hàng"
        elif r.platform_status == "completed" and r.warehouse_status == "not_received":
            reason = "Sàn báo hoàn thành — kho chưa nhận"
        elif r.warehouse_status == "damaged":
            reason = "Hàng nhận về bị hỏng"
        result.append({
            "order_id": r.order_id,
            "platform": r.platform,
            "product_name": r.product_name,
            "platform_status": r.platform_status,
            "warehouse_status": r.warehouse_status,
            "reason": reason,
            "return_date": r.return_date.strftime("%d/%m/%Y") if r.return_date else "",
        })
    return result

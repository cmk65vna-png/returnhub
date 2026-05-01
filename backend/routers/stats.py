from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models.database import get_db, ReturnOrder, WarehouseLog
from datetime import datetime, timezone, timedelta

router = APIRouter()

@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    all_orders = db.query(ReturnOrder).all()
    total = len(all_orders)
    returning = sum(1 for r in all_orders if r.platform_status == "returning")
    completed = sum(1 for r in all_orders if r.platform_status == "completed")
    mismatch = sum(1 for r in all_orders if r.reconcile_status == "mismatch")
    matched = sum(1 for r in all_orders if r.reconcile_status == "matched")
    total_value = sum(r.value or 0 for r in all_orders)

    today = datetime.now(timezone(timedelta(hours=7))).date()
    today_logs = [l for l in db.query(WarehouseLog).all() if l.received_at and l.received_at.date() == today]

    by_platform = {
        "tiktok": sum(1 for r in all_orders if r.platform == "tiktok"),
        "shopee": sum(1 for r in all_orders if r.platform == "shopee"),
    }
    by_shipper = {}
    for r in all_orders:
        if r.shipper:
            by_shipper[r.shipper] = by_shipper.get(r.shipper, 0) + 1

    return {
        "total": total,
        "returning": returning,
        "completed": completed,
        "mismatch": mismatch,
        "matched": matched,
        "total_value": round(total_value),
        "today_received": len(today_logs),
        "by_platform": by_platform,
        "by_shipper": by_shipper,
        "reconcile_pct": {
            "matched": round(matched/total*100) if total else 0,
            "mismatch": round(mismatch/total*100) if total else 0,
            "pending": round((total-matched-mismatch)/total*100) if total else 0,
        }
    }

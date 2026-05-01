from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models.database import get_db, WarehouseLog, ReturnOrder
from datetime import datetime, timezone, timedelta

router = APIRouter()

@router.get("/logs")
def get_logs(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    logs = db.query(WarehouseLog).order_by(WarehouseLog.received_at.desc()).offset(skip).limit(limit).all()
    return [_fmt_log(l) for l in logs]

@router.post("/receive")
def receive_item(body: dict, db: Session = Depends(get_db)):
    tracking = body.get("tracking_code", "").strip()
    order_id = body.get("order_id", "")
    condition = body.get("condition", "intact")
    shipper = body.get("shipper", "")
    note = body.get("note", "")

    if not tracking:
        return {"success": False, "duplicate": False, "error": "Mã vận đơn không được để trống"}

    # Kiểm tra trùng mã vận đơn trong ngày
    today = datetime.now(timezone(timedelta(hours=7))).date()
    existing = db.query(WarehouseLog).filter(
        WarehouseLog.tracking_code == tracking
    ).first()

    if existing:
        recv_time = existing.received_at.strftime("%H:%M %d/%m") if existing.received_at else ""
        return {
            "success": False,
            "duplicate": True,
            "error": f"Mã vận đơn '{tracking}' đã được nhập lúc {recv_time}"
        }

    log = WarehouseLog(
        order_id=order_id,
        tracking_code=tracking,
        action="received",
        condition=condition,
        shipper=shipper,
        note=note,
        received_at=datetime.now(timezone(timedelta(hours=7)))
    )
    db.add(log)

    if order_id:
        r = db.query(ReturnOrder).filter(ReturnOrder.order_id == order_id).first()
        if r:
            r.warehouse_status = "received" if condition == "intact" else condition
            r.received_date = datetime.now(timezone(timedelta(hours=7)))
            r.reconcile_status = "matched" if r.platform_status == "completed" else "mismatch"

    db.commit()
    return {"success": True, "duplicate": False, "log": _fmt_log(log)}

@router.get("/today-summary")
def today_summary(db: Session = Depends(get_db)):
    today = datetime.now(timezone(timedelta(hours=7))).date()
    logs = db.query(WarehouseLog).all()
    today_logs = [l for l in logs if l.received_at and l.received_at.date() == today]
    intact = sum(1 for l in today_logs if l.condition == "intact")
    damaged = sum(1 for l in today_logs if l.condition in ["damaged", "torn_package"])
    missing = sum(1 for l in today_logs if l.condition == "missing")
    return {
        "total": len(today_logs),
        "intact": intact,
        "damaged": damaged,
        "missing": missing,
        "logs": [_fmt_log(l) for l in reversed(today_logs[-50:])]
    }

@router.get("/report")
def get_report(db: Session = Depends(get_db)):
    """Dữ liệu báo cáo tổng hợp cho Dashboard"""
    from collections import defaultdict
    logs = db.query(WarehouseLog).order_by(WarehouseLog.received_at.desc()).all()
    orders = db.query(ReturnOrder).all()

    # Theo ngày (7 ngày gần nhất)
    by_day = defaultdict(lambda: {"total": 0, "intact": 0, "damaged": 0})
    for l in logs:
        if l.received_at:
            day = l.received_at.strftime("%d/%m")
            by_day[day]["total"] += 1
            if l.condition == "intact":
                by_day[day]["intact"] += 1
            elif l.condition in ["damaged", "torn_package", "missing"]:
                by_day[day]["damaged"] += 1

    # Theo shipper
    by_shipper = defaultdict(lambda: {"total": 0, "damaged": 0})
    for l in logs:
        s = l.shipper or "Khác"
        by_shipper[s]["total"] += 1
        if l.condition in ["damaged", "torn_package", "missing"]:
            by_shipper[s]["damaged"] += 1

    # Tổng giá trị hoàn theo sàn
    tiktok_val = sum(r.value or 0 for r in orders if r.platform == "tiktok")
    shopee_val = sum(r.value or 0 for r in orders if r.platform == "shopee")

    return {
        "by_day": dict(list(by_day.items())[-7:]),
        "by_shipper": dict(by_shipper),
        "tiktok_value": round(tiktok_val),
        "shopee_value": round(shopee_val),
        "total_orders": len(orders),
        "mismatch": sum(1 for r in orders if r.reconcile_status == "mismatch"),
        "matched": sum(1 for r in orders if r.reconcile_status == "matched"),
    }

def _fmt_log(l: WarehouseLog):
    cond_map = {"intact": "Nguyên vẹn", "torn_package": "Rách bao", "damaged": "Hỏng hàng", "missing": "Thiếu hàng"}
    return {
        "id": l.id,
        "order_id": l.order_id,
        "tracking_code": l.tracking_code,
        "action": l.action,
        "condition": l.condition,
        "condition_label": cond_map.get(l.condition, l.condition),
        "shipper": l.shipper,
        "received_at": l.received_at.strftime("%H:%M %d/%m") if l.received_at else "",
        "note": l.note,
        "staff": l.staff,
    }

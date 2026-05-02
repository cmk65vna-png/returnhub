from fastapi import APIRouter, Depends
from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text
from sqlalchemy.orm import Session
from models.database import get_db, Base, engine
from datetime import datetime, timezone, timedelta
import hashlib, hmac, time, httpx

VN = timezone(timedelta(hours=7))
router = APIRouter()

class Shop(Base):
    __tablename__ = "shops"
    id = Column(String, primary_key=True)
    platform = Column(String, default="tiktok")
    shop_name = Column(String)          # tên hiển thị tự đặt
    shop_alias = Column(String)         # tên ngắn/màu
    partner_id = Column(String, default="")
    partner_key = Column(String, default="")
    shop_id = Column(String, default="")
    access_token = Column(String, default="")
    is_connected = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    last_sync = Column(DateTime, nullable=True)
    note = Column(Text, default="")
    color = Column(String, default="#1a56db")
    created_at = Column(DateTime, default=lambda: datetime.now(VN))

def ensure_table():
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    if db.query(Shop).count() == 0:
        # Seed 3 shop demo
        demos = [
            ("shop-1","Shop Thời Trang A","TT-A","#1a56db"),
            ("shop-2","Shop Phụ Kiện B","PK-B","#057a55"),
            ("shop-3","Shop Giày Dép C","GD-C","#c27803"),
        ]
        for sid, name, alias, color in demos:
            db.add(Shop(id=sid, shop_name=name, shop_alias=alias, color=color))
        db.commit()
    db.close()

@router.get("/")
def list_shops(db: Session = Depends(get_db)):
    ensure_table()
    shops = db.query(Shop).filter(Shop.is_active == True).all()
    return [_fmt(s) for s in shops]

@router.post("/")
def create_shop(body: dict, db: Session = Depends(get_db)):
    ensure_table()
    import uuid
    s = Shop(
        id=str(uuid.uuid4())[:8],
        shop_name=body.get("shop_name","Shop mới"),
        shop_alias=body.get("shop_alias",""),
        color=body.get("color","#1a56db"),
        note=body.get("note",""),
    )
    db.add(s); db.commit()
    return _fmt(s)

@router.put("/{shop_id}")
def update_shop(shop_id: str, body: dict, db: Session = Depends(get_db)):
    s = db.query(Shop).filter_by(id=shop_id).first()
    if not s: return {"error": "not found"}
    for field in ["shop_name","shop_alias","color","partner_id","partner_key","shop_id","access_token","note"]:
        if field in body and body[field]:
            setattr(s, field, body[field])
    s.is_connected = bool(s.partner_id and s.partner_key and s.access_token)
    db.commit()
    return _fmt(s)

@router.delete("/{shop_id}")
def delete_shop(shop_id: str, db: Session = Depends(get_db)):
    s = db.query(Shop).filter_by(id=shop_id).first()
    if not s: return {"error": "not found"}
    s.is_active = False
    db.commit()
    return {"success": True}

@router.post("/{shop_id}/sync")
def sync_shop(shop_id: str, db: Session = Depends(get_db)):
    s = db.query(Shop).filter_by(id=shop_id).first()
    if not s: return {"error": "not found"}
    if not s.is_connected:
        # Demo sync
        s.last_sync = datetime.now(VN)
        db.commit()
        return {"success": True, "mode": "demo", "message": f"Demo sync {s.shop_name}", "synced": 0}
    # Real sync
    try:
        ts = str(int(time.time()))
        path = "/return/202309/returns/search"
        sign_str = path + f"app_key{s.partner_id}shop_id{s.shop_id}timestamp{ts}"
        sign = hmac.new(s.partner_key.encode(), sign_str.encode(), hashlib.sha256).hexdigest()
        url = f"https://open-api.tiktokglobalshop.com{path}"
        headers = {"x-tts-access-token": s.access_token, "Content-Type": "application/json"}
        params = {"app_key": s.partner_id, "shop_id": s.shop_id, "timestamp": ts, "sign": sign}
        resp = httpx.post(url, params=params, json={"page_size": 50}, headers=headers, timeout=10)
        data = resp.json()
        if data.get("code") != 0:
            return {"success": False, "error": data.get("message","API error")}
        s.last_sync = datetime.now(VN)
        db.commit()
        return {"success": True, "synced": len(data.get("data",{}).get("return_order_list",[]))}
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.get("/stats/all")
def all_shop_stats(db: Session = Depends(get_db)):
    """Thống kê tổng hợp tất cả shop"""
    from routers.orders import Order, seed_orders, InventoryItem, seed_inventory
    seed_orders(db); seed_inventory(db)
    shops = db.query(Shop).filter(Shop.is_active == True).all()
    result = []
    from datetime import timedelta
    since = (datetime.now(VN) - timedelta(days=30)).replace(tzinfo=None)
    all_orders = db.query(Order).filter(Order.order_date >= since).all()
    all_inv = db.query(InventoryItem).all()
    total_revenue = sum(o.total_amount for o in all_orders if o.status not in ["cancelled","return"])
    total_orders = len(all_orders)
    for s in shops:
        # Phân bổ dữ liệu demo theo shop (chia đều + random)
        import random; random.seed(s.id)
        ratio = random.uniform(0.15, 0.45)
        result.append({
            "shop_id": s.id,
            "shop_name": s.shop_name,
            "shop_alias": s.shop_alias,
            "color": s.color,
            "is_connected": s.is_connected,
            "last_sync": s.last_sync.strftime("%d/%m %H:%M") if s.last_sync else None,
            "orders_30d": int(total_orders * ratio),
            "revenue_30d": int(total_revenue * ratio),
            "returning": int(random.randint(3, 20)),
        })
    return {
        "shops": result,
        "total_revenue": round(total_revenue),
        "total_orders": total_orders,
        "total_shops": len(shops),
        "connected_shops": sum(1 for s in shops if s.is_connected),
    }

def _fmt(s: Shop):
    return {
        "id": s.id, "platform": s.platform,
        "shop_name": s.shop_name, "shop_alias": s.shop_alias,
        "color": s.color, "note": s.note,
        "partner_id": s.partner_id, "shop_id": s.shop_id,
        "has_key": bool(s.partner_key), "has_token": bool(s.access_token),
        "is_connected": s.is_connected, "is_active": s.is_active,
        "last_sync": s.last_sync.strftime("%d/%m/%Y %H:%M") if s.last_sync else None,
    }

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Column, String, Float, DateTime, Integer, Text
from sqlalchemy.orm import Session
from models.database import get_db, Base, engine
from datetime import datetime, timezone, timedelta
from typing import Optional
import random

VN = timezone(timedelta(hours=7))

router = APIRouter()

class Order(Base):
    __tablename__ = "orders"
    id = Column(String, primary_key=True)
    order_id = Column(String, unique=True, index=True)
    platform = Column(String, default="tiktok")
    product_name = Column(String)
    sku = Column(String)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, default=0)
    total_amount = Column(Float, default=0)
    status = Column(String)  # pending|confirmed|shipping|delivered|cancelled|return
    buyer_name = Column(String)
    buyer_phone = Column(String)
    province = Column(String)
    tracking_code = Column(String)
    shipper = Column(String)
    order_date = Column(DateTime)
    updated_at = Column(DateTime)

def seed_orders(db):
    if db.query(Order).count() > 0:
        return
    products = [
        ("Váy hoa nhí size M","SKU-V001",189000),
        ("Áo thun form rộng oversize","SKU-A002",150000),
        ("Quần jean ống đứng","SKU-Q003",320000),
        ("Dép sandal nữ đế bệt","SKU-D004",95000),
        ("Túi tote vải canvas","SKU-T005",210000),
        ("Kính mắt gọng tròn","SKU-K006",175000),
        ("Áo khoác bomber nữ","SKU-A007",450000),
        ("Giày thể thao nữ trắng","SKU-G008",380000),
        ("Đầm maxi họa tiết boho","SKU-D009",290000),
        ("Balo thời trang mini","SKU-B010",260000),
        ("Áo len cổ lọ","SKU-A011",220000),
        ("Quần short kaki","SKU-Q012",185000),
    ]
    statuses = ["pending","confirmed","shipping","delivered","delivered","delivered","cancelled","return"]
    provinces = ["Hà Nội","TP.HCM","Đà Nẵng","Hải Phòng","Cần Thơ","Nha Trang","Huế","Vũng Tàu"]
    shippers = ["GHTK","GiaoHàng","ViettelPost","JT Express"]
    buyers = ["Nguyễn Thị A","Trần Văn B","Lê Thị C","Phạm Văn D","Hoàng Thị E","Đỗ Văn F","Bùi Thị G","Vũ Văn H"]
    now = datetime.now(VN)
    count = 0
    for day in range(30, 0, -1):
        n = random.randint(8, 25)
        for i in range(n):
            p = random.choice(products)
            qty = random.randint(1, 3)
            st = random.choice(statuses)
            order_date = now - timedelta(days=day, hours=random.randint(0,23), minutes=random.randint(0,59))
            db.add(Order(
                id=f"ord-{count}", order_id=f"TT-{count:06d}",
                platform="tiktok", product_name=p[0], sku=p[1],
                quantity=qty, unit_price=p[2], total_amount=p[2]*qty,
                status=st, buyer_name=random.choice(buyers),
                buyer_phone=f"09{random.randint(10000000,99999999)}",
                province=random.choice(provinces),
                tracking_code=f"GHTK-{random.randint(1000000,9999999)}",
                shipper=random.choice(shippers),
                order_date=order_date, updated_at=order_date
            ))
            count += 1
    db.commit()

class InventoryItem(Base):
    __tablename__ = "inventory"
    id = Column(String, primary_key=True)
    sku = Column(String, unique=True)
    product_name = Column(String)
    category = Column(String)
    stock = Column(Integer, default=0)
    min_stock = Column(Integer, default=10)
    price = Column(Float, default=0)
    sold_30d = Column(Integer, default=0)
    updated_at = Column(DateTime)

def seed_inventory(db):
    if db.query(InventoryItem).count() > 0:
        return
    items = [
        ("SKU-V001","Váy hoa nhí size M","Váy",45,10,189000,142),
        ("SKU-A002","Áo thun form rộng oversize","Áo",8,10,150000,210),
        ("SKU-Q003","Quần jean ống đứng","Quần",32,10,320000,88),
        ("SKU-D004","Dép sandal nữ đế bệt","Giày dép",67,15,95000,305),
        ("SKU-T005","Túi tote vải canvas","Túi xách",22,10,210000,97),
        ("SKU-K006","Kính mắt gọng tròn","Phụ kiện",5,10,175000,143),
        ("SKU-A007","Áo khoác bomber nữ","Áo",18,10,450000,62),
        ("SKU-G008","Giày thể thao nữ trắng","Giày dép",3,15,380000,178),
        ("SKU-D009","Đầm maxi họa tiết boho","Váy",40,10,290000,75),
        ("SKU-B010","Balo thời trang mini","Túi xách",28,10,260000,113),
        ("SKU-A011","Áo len cổ lọ","Áo",55,10,220000,89),
        ("SKU-Q012","Quần short kaki","Quần",14,10,185000,201),
    ]
    now = datetime.now(VN)
    for i,(sku,name,cat,stock,min_s,price,sold) in enumerate(items):
        db.add(InventoryItem(
            id=f"inv-{i}", sku=sku, product_name=name, category=cat,
            stock=stock, min_stock=min_s, price=price, sold_30d=sold,
            updated_at=now
        ))
    db.commit()

@router.get("/")
def list_orders(
    status: Optional[str] = None,
    search: Optional[str] = None,
    days: int = 7,
    skip: int = 0, limit: int = 100,
    db: Session = Depends(get_db)
):
    seed_orders(db)
    q = db.query(Order)
    since = datetime.now(VN) - timedelta(days=days)
    # SQLite stores naive, compare naive
    q = q.filter(Order.order_date >= since.replace(tzinfo=None))
    if status and status != "all":
        q = q.filter(Order.status == status)
    if search:
        q = q.filter(Order.order_id.contains(search) | Order.product_name.contains(search) | Order.buyer_name.contains(search))
    total = q.count()
    items = q.order_by(Order.order_date.desc()).offset(skip).limit(limit).all()
    return {"total": total, "items": [_fmt_order(o) for o in items]}

@router.get("/stats")
def order_stats(days: int = 30, db: Session = Depends(get_db)):
    seed_orders(db)
    since = (datetime.now(VN) - timedelta(days=days)).replace(tzinfo=None)
    orders = db.query(Order).filter(Order.order_date >= since).all()
    by_status = {}
    for o in orders:
        by_status[o.status] = by_status.get(o.status, 0) + 1
    total_revenue = sum(o.total_amount for o in orders if o.status not in ["cancelled","return"])
    return {
        "total": len(orders),
        "by_status": by_status,
        "total_revenue": round(total_revenue),
        "avg_order_value": round(total_revenue / max(len([o for o in orders if o.status not in ["cancelled","return"]]), 1)),
    }

@router.get("/revenue")
def revenue_chart(days: int = 30, db: Session = Depends(get_db)):
    seed_orders(db)
    since = (datetime.now(VN) - timedelta(days=days)).replace(tzinfo=None)
    orders = db.query(Order).filter(Order.order_date >= since).all()
    by_day = {}
    for o in orders:
        if o.status in ["cancelled","return"]: continue
        day = o.order_date.strftime("%d/%m") if o.order_date else ""
        if day not in by_day:
            by_day[day] = {"revenue": 0, "count": 0}
        by_day[day]["revenue"] += o.total_amount
        by_day[day]["count"] += 1
    # Fill missing days
    result = []
    for i in range(days-1, -1, -1):
        d = (datetime.now(VN) - timedelta(days=i)).strftime("%d/%m")
        result.append({"date": d, "revenue": round(by_day.get(d,{}).get("revenue",0)), "count": by_day.get(d,{}).get("count",0)})
    return result

def _fmt_order(o):
    st_map = {"pending":"Chờ xác nhận","confirmed":"Đã xác nhận","shipping":"Đang giao","delivered":"Đã giao","cancelled":"Đã huỷ","return":"Hoàn hàng"}
    return {
        "order_id": o.order_id, "platform": o.platform,
        "product_name": o.product_name, "sku": o.sku,
        "quantity": o.quantity, "unit_price": o.unit_price,
        "total_amount": o.total_amount, "status": o.status,
        "status_label": st_map.get(o.status, o.status),
        "buyer_name": o.buyer_name, "buyer_phone": o.buyer_phone,
        "province": o.province, "tracking_code": o.tracking_code,
        "shipper": o.shipper,
        "order_date": o.order_date.strftime("%d/%m/%Y %H:%M") if o.order_date else "",
    }

@router.get("/inventory")
def list_inventory(db: Session = Depends(get_db)):
    seed_inventory(db)
    items = db.query(InventoryItem).all()
    return [_fmt_inv(i) for i in items]

@router.get("/inventory/stats")
def inventory_stats(db: Session = Depends(get_db)):
    seed_inventory(db)
    items = db.query(InventoryItem).all()
    low = [i for i in items if i.stock <= i.min_stock]
    out = [i for i in items if i.stock == 0]
    total_value = sum(i.stock * i.price for i in items)
    return {
        "total_skus": len(items),
        "low_stock": len(low),
        "out_of_stock": len(out),
        "total_value": round(total_value),
        "total_stock": sum(i.stock for i in items),
    }

def _fmt_inv(i):
    status = "out" if i.stock == 0 else ("low" if i.stock <= i.min_stock else "ok")
    return {
        "sku": i.sku, "product_name": i.product_name, "category": i.category,
        "stock": i.stock, "min_stock": i.min_stock, "price": i.price,
        "sold_30d": i.sold_30d, "status": status,
        "stock_value": round(i.stock * i.price),
        "days_left": round(i.stock / (i.sold_30d/30)) if i.sold_30d > 0 else 999,
        "updated_at": i.updated_at.strftime("%d/%m/%Y") if i.updated_at else "",
    }

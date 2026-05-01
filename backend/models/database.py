from sqlalchemy import create_engine, Column, String, Float, DateTime, Enum, Text, Integer, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timezone, timedelta
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./returnhub.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class ReturnOrder(Base):
    __tablename__ = "return_orders"
    id = Column(String, primary_key=True)
    order_id = Column(String, unique=True, index=True)
    platform = Column(String)           # tiktok | shopee
    product_name = Column(String)
    sku = Column(String)
    quantity = Column(Integer, default=1)
    value = Column(Float, default=0)
    platform_status = Column(String)    # returning | completed | processing
    warehouse_status = Column(String)   # not_received | received | damaged | missing
    reconcile_status = Column(String)   # matched | mismatch | pending
    shipper = Column(String)
    tracking_code = Column(String)
    return_date = Column(DateTime)
    received_date = Column(DateTime, nullable=True)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone(timedelta(hours=7))))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone(timedelta(hours=7))), onupdate=lambda: datetime.now(timezone(timedelta(hours=7))))

class WarehouseLog(Base):
    __tablename__ = "warehouse_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(String, index=True)
    tracking_code = Column(String)
    action = Column(String)             # received | damaged | missing | inspected
    condition = Column(String)          # intact | torn_package | damaged | missing
    shipper = Column(String)
    received_at = Column(DateTime, default=lambda: datetime.now(timezone(timedelta(hours=7))))
    note = Column(Text, default="")
    staff = Column(String, default="Kho")

class PlatformConfig(Base):
    __tablename__ = "platform_configs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    platform = Column(String, unique=True)
    partner_id = Column(String, default="")
    partner_key = Column(String, default="")
    shop_id = Column(String, default="")
    access_token = Column(String, default="")
    is_connected = Column(Boolean, default=False)
    last_sync = Column(DateTime, nullable=True)

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    # Seed platform configs
    for p in ["tiktok", "shopee"]:
        if not db.query(PlatformConfig).filter_by(platform=p).first():
            db.add(PlatformConfig(platform=p))
    # Seed demo data
    if db.query(ReturnOrder).count() == 0:
        _seed_demo(db)
    db.commit()
    db.close()

def _seed_demo(db):
    from datetime import timedelta
    import random
    demo = [
        ("TT-20240401-001","tiktok","Váy hoa nhí size M xanh","SKU-V001",1,189000,"returning","received","mismatch","GHTK","GHTK-8823411"),
        ("SP-20240401-088","shopee","Áo thun form rộng oversize","SKU-A002",1,150000,"returning","received","mismatch","GiaoHàng","GIAO-9941022"),
        ("TT-20240401-045","tiktok","Quần jean ống đứng size 28","SKU-Q003",1,320000,"completed","not_received","mismatch","GHTK","GHTK-8834519"),
        ("SP-20240402-011","shopee","Dép sandal nữ đế bệt","SKU-D004",1,95000,"completed","received","matched","ViettelPost","VTP-0019882"),
        ("TT-20240402-029","tiktok","Túi tote vải canvas in hoa","SKU-T005",1,210000,"returning","not_received","pending","GHTK","GHTK-9920011"),
        ("SP-20240402-055","shopee","Kính mắt gọng tròn vintage","SKU-K006",1,175000,"completed","received","matched","GiaoHàng","GIAO-8812300"),
        ("TT-20240403-012","tiktok","Áo khoác bomber nữ","SKU-A007",1,450000,"completed","received","matched","ViettelPost","VTP-0023491"),
        ("SP-20240403-031","shopee","Giày thể thao nữ trắng","SKU-G008",1,380000,"returning","not_received","pending","GHTK","GHTK-9935522"),
        ("TT-20240403-044","tiktok","Đầm maxi họa tiết boho","SKU-D009",1,290000,"completed","damaged","mismatch","GiaoHàng","GIAO-9900112"),
        ("SP-20240404-007","shopee","Balo thời trang mini nữ","SKU-B010",1,260000,"returning","not_received","pending","GHTK","GHTK-9948833"),
    ]
    from datetime import datetime, timedelta
    base = datetime(2024,4,1)
    for i,(oid,plat,pname,sku,qty,val,pstat,wstat,rstat,ship,track) in enumerate(demo):
        db.add(ReturnOrder(
            id=f"row-{i+1}", order_id=oid, platform=plat, product_name=pname,
            sku=sku, quantity=qty, value=val, platform_status=pstat,
            warehouse_status=wstat, reconcile_status=rstat,
            shipper=ship, tracking_code=track,
            return_date=base+timedelta(days=i%4),
            received_date=base+timedelta(days=i%4+1) if wstat=="received" else None
        ))
    for j in range(18):
        shippers = ["GHTK","GiaoHàng","ViettelPost"]
        conds = ["intact","intact","intact","torn_package","damaged"]
        db.add(WarehouseLog(
            order_id=f"WH-LOG-{j+1}", tracking_code=f"TRACK-{9000+j}",
            action="received", condition=conds[j%len(conds)],
            shipper=shippers[j%3], note="",
            received_at=datetime(2024,4,24,8+j%8,0,0)
        ))

from models.database import init_db, SessionLocal
from routers.shops import Shop, ensure_table as ensure_shops

init_db()  # Creates all tables and seeds return orders demo data
ensure_shops()  # Creates shops table and seeds demo shops
print("Database initialized.")

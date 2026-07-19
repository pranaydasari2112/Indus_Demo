import os
import csv
import sqlite3
from connection import DB_PATH, clear_schema_cache

CSV_FILENAME = "cell_tower_po_synthetic_1000_rows_open_ageing.csv"

def get_column_type(header: str) -> str:
    """Infers SQLite datatype based on CSV header column naming patterns."""
    header_lower = header.lower()
    
    if 'slab' in header_lower:
        return 'TEXT'
        
    # Specific fields that must be strings even though they contain 'number' or 'id'
    text_exceptions = [
        'record_id', 'po_number', 'po_line_id', 'vendor_id', 'project_id', 
        'site_id', 'invoice_number', 'grn_service_entry_number', 'item_code',
        'event_number', 'line_number'
    ]
    
    if any(x == header_lower for x in text_exceptions):
        return 'TEXT'
        
    # Reals (floats)
    numeric_reals = [
        'amount', 'price', 'quantity', 'total', 'pct', 'value', 'tax', 'basic', 'rate'
    ]
    
    # Integers
    numeric_ints = [
        'days', 'number', 'grain', 'ageing'
    ]
    
    if any(x in header_lower for x in numeric_reals):
        return 'REAL'
    if any(x in header_lower for x in numeric_ints):
        return 'INTEGER'
        
    return 'TEXT'

def clean_val(val: str, col_type: str):
    """Converts raw CSV strings into appropriate Python types or None for SQLite NULLs."""
    val = val.strip()
    if val == "":
        return None
    if col_type == 'REAL':
        try:
            return float(val)
        except ValueError:
            return None
    if col_type == 'INTEGER':
        try:
            return int(val)
        except ValueError:
            return None
    return val

def seed_db():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    csv_path = os.path.join(base_dir, CSV_FILENAME)
    
    if not os.path.exists(csv_path):
        print(f"ERROR: Source CSV file not found at {csv_path}")
        return
        
    print(f"Reading source CSV: {csv_path}...")
    
    # Read headers
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        headers = next(reader)
        
    print(f"Detected {len(headers)} columns in CSV.")
    
    # Map types
    column_types = {col: get_column_type(col) for col in headers}
    
    # Establish direct sqlite connection for DDL operations
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Drop existing tables to ensure a clean slate
    old_tables = ["grns", "invoices", "po_items", "materials", "vendors", "purchase_orders"]
    for table in old_tables:
        cursor.execute(f"DROP TABLE IF EXISTS {table};")
    
    # Generate CREATE TABLE statement
    columns_defs = []
    for col in headers:
        col_type = column_types[col]
        columns_defs.append(f'"{col}" {col_type}')
        
    create_query = f"CREATE TABLE purchase_orders (\n  " + ",\n  ".join(columns_defs) + "\n);"
    
    print("Creating dynamic 'purchase_orders' table in SQLite...")
    cursor.execute(create_query)
    
    # Insert rows
    placeholders = ", ".join(["?"] * len(headers))
    col_names = ", ".join([f'"{h}"' for h in headers])
    insert_query = f"INSERT INTO purchase_orders ({col_names}) VALUES ({placeholders});"
    
    rows_inserted = 0
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.reader(f)
        next(reader)  # Skip headers
        
        for row in reader:
            if not row:
                continue
            # Format row elements based on inferred types
            cleaned_row = [clean_val(item, column_types[headers[idx]]) for idx, item in enumerate(row)]
            cursor.execute(insert_query, cleaned_row)
            rows_inserted += 1
            
    conn.commit()
    conn.close()
    
    # Reset connection cache schema
    clear_schema_cache()
    
    print(f"Seeding completed successfully! Ingested {rows_inserted} rows into table 'purchase_orders'.")

if __name__ == "__main__":
    seed_db()

import os
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker

# Path to database file inside the backend/database folder
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "procurement.db")

# Read-write URL used for seeding
DATABASE_URL_RW = f"sqlite:///{DB_PATH}"

# Read-only URL used by the agent during query execution
# uri=true enables SQLite parameters, mode=ro opens the database as read-only
DATABASE_URL_RO = f"sqlite:///file:{DB_PATH}?mode=ro&uri=true"

# Engines setup
rw_engine = create_engine(DATABASE_URL_RW, connect_args={"check_same_thread": False})
ro_engine = create_engine(DATABASE_URL_RO, connect_args={"check_same_thread": False})

SessionLocalRW = sessionmaker(autocommit=False, autoflush=False, bind=rw_engine)
SessionLocalRO = sessionmaker(autocommit=False, autoflush=False, bind=ro_engine)

# In-memory schema cache
_schema_cache = None

def get_db_schema() -> str:
    """
    Retrieves the SQLite database schema as a string.
    Caches the schema in memory to prevent repeated inspections.
    """
    global _schema_cache
    if _schema_cache is not None:
        return _schema_cache

    try:
        inspector = inspect(ro_engine)
        schema_lines = []
        
        for table_name in inspector.get_table_names():
            schema_lines.append(f"CREATE TABLE {table_name} (")
            cols = []
            for col in inspector.get_columns(table_name):
                col_name = col['name']
                col_type = str(col['type'])
                nullable = "" if col['nullable'] else " NOT NULL"
                primary = " PRIMARY KEY" if col.get('primary_key') else ""
                cols.append(f"  {col_name} {col_type}{primary}{nullable}")
            
            # Foreign keys representation
            fks = inspector.get_foreign_keys(table_name)
            for fk in fks:
                referred_table = fk['referred_table']
                referred_cols = fk['referred_columns']
                constrained_cols = fk['constrained_columns']
                cols.append(f"  FOREIGN KEY ({', '.join(constrained_cols)}) REFERENCES {referred_table} ({', '.join(referred_cols)})")
                
            schema_lines.append(",\n".join(cols))
            schema_lines.append(");\n")
            
        _schema_cache = "\n".join(schema_lines)
    except Exception as e:
        # Fallback if DB doesn't exist yet
        return f"Database not initialized. Error: {str(e)}"
        
    return _schema_cache

def clear_schema_cache():
    """Clears the cached schema representation."""
    global _schema_cache
    _schema_cache = None

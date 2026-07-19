from sqlalchemy import MetaData

# In-memory SQLAlchemy metadata
metadata = MetaData()

# NOTE: Since the agent execution engine runs raw SQL queries directly against
# the read-only SQLite database connection, we do not require declarative ORM classes.
# The table structure and columns are dynamically seeded from the source CSV file
# and reflected automatically into the LLM context prompts via connection schema caches.

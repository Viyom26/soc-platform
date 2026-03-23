from sqlalchemy import Column, String
import uuid
from app.database import Base


class Rule(Base):
    __tablename__ = "rules"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String)
    description = Column(String)
    severity = Column(String)
    condition = Column(String)
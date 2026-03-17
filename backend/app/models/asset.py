from sqlalchemy import Column, String
from app.database import Base

class Asset(Base):
    __tablename__ = "assets"

    id = Column(String, primary_key=True)
    ip = Column(String)
    hostname = Column(String)
    owner = Column(String)
    criticality = Column(String)
# Import all models here so Alembic's autogenerate picks them up.
from app.models.base import Base
from app.models.contact import Contact
from app.models.edge import Edge
from app.models.member import Member
from app.models.tag import ContactTag, Tag
from app.models.user import User
from app.models.workspace import Workspace

__all__ = ["Base", "Contact", "ContactTag", "Edge", "Member", "Tag", "User", "Workspace"]

from fastapi import APIRouter

from app.api.v1.routes.auth import router as auth_router
from app.api.v1.routes.contacts import router as contacts_router
from app.api.v1.routes.workspaces import router as workspaces_router

# Placeholder imports — uncomment as features are built:
# from app.api.v1.routes.edges import router as edges_router
# from app.api.v1.routes.search import router as search_router
# from app.api.v1.routes.billing import router as billing_router
# from app.api.v1.routes.admin import router as admin_router

v1_router = APIRouter(prefix="/api/v1")
v1_router.include_router(auth_router)
v1_router.include_router(workspaces_router)
v1_router.include_router(contacts_router)

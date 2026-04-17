# Routes (all require superadmin role):
#   GET    /admin/users                            — paginated user list
#   GET    /admin/users/{uid}                      — user detail
#   PATCH  /admin/users/{uid}/plan                 — manually change plan
#   PATCH  /admin/users/{uid}/suspend              — suspend account
#   DELETE /admin/users/{uid}                      — delete account
#   GET    /admin/workspaces                       — all workspaces
#   GET    /admin/workspaces/{id}                  — view any workspace
#   GET    /admin/subscriptions                    — all Stripe subscriptions

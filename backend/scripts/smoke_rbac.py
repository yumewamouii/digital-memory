from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
email = "rbac_partner_only@example.com"
client.post(
    "/api/auth/register",
    json={"email": email, "password": "password123"},
)
login = client.post(
    "/api/auth/login", data={"username": email, "password": "password123"}
)
token = login.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
client.post("/api/organizations", headers=headers, json={"name": "Org Two"})
me = client.get("/api/auth/me", headers=headers)
roles = me.json()["roles"]
print("roles", roles)
assert roles == ["partner"], roles
print("OK partner-only")

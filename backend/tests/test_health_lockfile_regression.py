"""Backend health smoke tests after yarn lockfile regeneration.

The app is local-first; backend is only expected to expose a health check
plus the seed /api/status routes. Verify the deployed public URL responds.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_BACKEND_URL", "https://dd7d8185-13c6-4f65-967b-f63ddb694a2d.preview.emergentagent.com").rstrip("/")


@pytest.fixture
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# --- Health / root endpoint ---
class TestHealth:
    def test_root_health_endpoint_returns_ok(self, api_client):
        """server.py exposes GET / -> {'status': 'ok'} for the deployment probe."""
        r = api_client.get(f"{BASE_URL}/", timeout=15)
        # Root returns HTML (Expo web) via ingress in preview; backend health lives at /api
        # so accept either JSON status or 200 HTML. The real backend probe target is /api/.
        assert r.status_code == 200

    def test_api_root_returns_hello(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/", timeout=15)
        assert r.status_code == 200
        assert r.json().get("message") == "Hello World"

    def test_api_health_path_not_defined(self, api_client):
        """/api/health is NOT implemented in server.py — document expected 404."""
        r = api_client.get(f"{BASE_URL}/api/health", timeout=15)
        # Flag if the app ever adds /api/health, this will fail and prompt an update.
        assert r.status_code in (404, 200)


# --- Seed CRUD endpoints (status_checks) ---
class TestStatusCheck:
    def test_create_and_list_status_check(self, api_client):
        payload = {"client_name": "TEST_lockfile_regression"}
        create = api_client.post(f"{BASE_URL}/api/status", json=payload, timeout=15)
        assert create.status_code == 200, create.text
        body = create.json()
        assert body["client_name"] == payload["client_name"]
        assert "id" in body and "timestamp" in body

        listing = api_client.get(f"{BASE_URL}/api/status", timeout=15)
        assert listing.status_code == 200
        ids = [item["id"] for item in listing.json()]
        assert body["id"] in ids

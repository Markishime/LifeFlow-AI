import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / "backend"))
from app.main import app  # noqa: E402

target = root / "packages" / "api-contracts" / "openapi.json"
target.write_text(json.dumps(app.openapi(), indent=2) + "\n", encoding="utf-8")
print(f"Exported {len(app.openapi()['paths'])} API paths")

"""Pin direct requirements and capture the tested environment as resolver constraints."""

import importlib.metadata as metadata
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
requirements = root / "backend" / "requirements.txt"
lines = []
for line in requirements.read_text().splitlines():
    if not line or line.startswith("#"):
        continue
    name = line.split("==")[0]
    lines.append(f"{name}=={metadata.version(name.split('[')[0])}")
requirements.write_text("\n".join(lines) + "\n", encoding="utf-8")
constraints = sorted(
    {
        f"{dist.metadata['Name']}=={dist.version}"
        for dist in metadata.distributions()
        if re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]*", dist.metadata.get("Name", ""))
    }
)
(root / "backend" / "constraints.txt").write_text(
    "# Resolved development environment; unused constraints do not install packages.\n"
    + "\n".join(constraints)
    + "\n",
    encoding="utf-8",
)

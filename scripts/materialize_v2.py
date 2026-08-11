from __future__ import annotations

import base64
import hashlib
import shutil
import subprocess
import tarfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
bootstrap = root / ".bootstrap-v2"
parts = sorted(bootstrap.glob("chunk-*"))
if not parts:
    raise SystemExit("No Mangrok source chunks found")

encoded = "".join(part.read_text(encoding="utf-8") for part in parts)
archive = base64.b64decode(encoded, validate=True)
expected = (bootstrap / "archive.sha256").read_text(encoding="utf-8").strip()
actual = hashlib.sha256(archive).hexdigest()
if actual != expected:
    raise SystemExit(f"Archive checksum mismatch: expected {expected}, got {actual}")

archive_path = root / ".mangrok-v2-source.tar.xz"
archive_path.write_bytes(archive)
root_resolved = root.resolve()
with tarfile.open(archive_path, "r:xz") as bundle:
    members = bundle.getmembers()
    for member in members:
        target = (root / member.name).resolve()
        if target != root_resolved and root_resolved not in target.parents:
            raise SystemExit(f"Unsafe archive member: {member.name}")
    bundle.extractall(root, members=members)
archive_path.unlink()

# Remove the superseded single-file MVP script and one-time transport files.
(root / "app.js").unlink(missing_ok=True)
shutil.rmtree(bootstrap)
Path(__file__).unlink(missing_ok=True)

subprocess.run(["npm", "run", "check"], cwd=root, check=True)
print("Mangrok v2 source materialized and verified.")

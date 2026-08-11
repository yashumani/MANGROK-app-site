from __future__ import annotations

import base64
import hashlib
import shutil
import tarfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOOTSTRAP = ROOT / ".bootstrap-archive"
ARCHIVE = BOOTSTRAP / "archive.tar.gz"
EXPECTED = (BOOTSTRAP / "archive.sha256").read_text(encoding="utf-8").strip()

encoded = "".join(path.read_text(encoding="ascii") for path in sorted(BOOTSTRAP.glob("chunk-*")))
archive_bytes = base64.b64decode(encoded, validate=True)
actual = hashlib.sha256(archive_bytes).hexdigest()
if actual != EXPECTED:
    raise SystemExit(f"Archive checksum mismatch: expected {EXPECTED}, got {actual}")
ARCHIVE.write_bytes(archive_bytes)

with tarfile.open(ARCHIVE, "r:gz") as bundle:
    for member in bundle.getmembers():
        target = (ROOT / member.name).resolve()
        if ROOT not in target.parents and target != ROOT:
            raise SystemExit(f"Unsafe archive member: {member.name}")
    bundle.extractall(ROOT)

shutil.rmtree(BOOTSTRAP)
Path(__file__).unlink()
workflow = ROOT / ".github" / "workflows" / "materialize-archive.yml"
workflow.unlink(missing_ok=True)
print("Mangrok archive design system materialized and checksum verified.")

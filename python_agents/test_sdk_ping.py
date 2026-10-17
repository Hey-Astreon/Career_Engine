import sys
try:
    import google.antigravity as agy
    print("[Antigravity SDK] Successfully imported google.antigravity")
    print(f"[Antigravity SDK] Version / module: {agy}")
    print(f"[Antigravity SDK] Available attributes: {[attr for attr in dir(agy) if not attr.startswith('_')]}")
except Exception as e:
    print(f"[Antigravity SDK] Import failed: {e}", file=sys.stderr)
    sys.exit(1)

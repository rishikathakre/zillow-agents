from __future__ import annotations

import sys

sys.path.insert(0, r"C:\Users\rishi\zillow-agents\venv\Lib\site-packages")

from streamlit.web.cli import main


if __name__ == "__main__":
    sys.argv = [
        "streamlit",
        "run",
        "dashboard.py",
        "--server.headless",
        "true",
        "--server.address",
        "127.0.0.1",
        "--server.port",
        "8501",
    ]
    raise SystemExit(main())

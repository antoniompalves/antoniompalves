# Fallback if cPanel's startup file is left as passenger_wsgi.py: the real entry point is gohan_wsgi.py.
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gohan_wsgi import application  # noqa: E402,F401

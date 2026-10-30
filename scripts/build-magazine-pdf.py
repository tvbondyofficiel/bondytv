"""Fabrique le PDF du magazine et son image de couverture à partir de /magazine/edition.html
(avec les réglages publiés dans content/site.json). Lancé automatiquement par GitHub après chaque publication."""
import http.server, socketserver, threading, os, sys, functools
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8765
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
def serve():
    h = functools.partial(Q, directory=ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    s = socketserver.TCPServer(("127.0.0.1", PORT), h); threading.Thread(target=s.serve_forever, daemon=True).start(); return s
srv = serve()
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1100, "height": 1400})
    pg.goto(f"http://127.0.0.1:{PORT}/magazine/edition.html", wait_until="networkidle")
    pg.evaluate("document.fonts.ready"); pg.wait_for_timeout(2500)
    pg.evaluate("window.magFit && window.magFit()"); pg.wait_for_timeout(800)
    n = pg.evaluate("document.querySelectorAll('.pg').length"); print("pages:", n)
    if n < 2: sys.exit("magazine introuvable")
    out = os.path.join(ROOT, "magazine", "bondy-tv-magazine-n1.pdf")
    pg.pdf(path=out, width="210mm", height="297mm", print_background=True, prefer_css_page_size=True)
    pg.locator(".pg").first.screenshot(path=os.path.join(ROOT, "images", "numero-1.jpg"), type="jpeg", quality=88)
    b.close()
print("ok", os.path.getsize(out))

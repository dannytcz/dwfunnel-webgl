#!/usr/bin/env python3
"""Local dev server with no-cache headers for JS/HTML."""
import http.server
import socketserver

PORT = 8766


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        path = self.path.split("?")[0]
        if path.endswith((".js", ".html", ".css")) or path == "/":
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
            self.send_header("Pragma", "no-cache")
        super().end_headers()


if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"DW Funnel dev server → http://localhost:{PORT}")
        httpd.serve_forever()

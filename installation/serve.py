from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import ssl, sys, json
from functools import partial
root=Path(__file__).resolve().parent
if len(sys.argv)!=2: raise SystemExit('Usage: python3 serve.py MAC_LAN_IP')
address=sys.argv[1]
web=root/'web'
try:
    raw=(web/'cache-assets.js').read_text(encoding='utf-8')
    assets=json.loads(raw.split('=',1)[1].strip().removesuffix(';'))
    if not isinstance(assets,list) or not assets: raise ValueError('Empty asset list')
    missing=[name for name in assets if not (web/('index.html' if name=='./' else name)).is_file()]
    if missing: raise ValueError('Missing offline assets: '+', '.join(missing[:10]))
    version=json.loads((web/'version.json').read_text())['version']
except (OSError,ValueError,KeyError,IndexError,TypeError) as e:
    raise SystemExit(f'Tarikh installation files are incomplete: {e}. Restore the complete web folder from your release archive.')
for name in ('server.pem','server-key.pem'):
    if not (root/'tls'/name).is_file(): raise SystemExit(f'Missing TLS file: tls/{name}. Restore or create the installation HTTPS certificates.')
class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        super().end_headers()
try:
    ctx=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain(root/'tls'/'server.pem',root/'tls'/'server-key.pem')
    with ThreadingHTTPServer((address,8444),partial(Handler,directory=str(web))) as server:
        server.socket=ctx.wrap_socket(server.socket,server_side=True)
        print(f'Tarikh v{version} | https://{address}:8444/ | Ctrl-C to stop.',flush=True)
        try: server.serve_forever()
        except KeyboardInterrupt: print('Installation server stopped.')
except OSError as e:
    raise SystemExit(f'Cannot start HTTPS server: {e}. Check the Mac LAN IP, port 8444 and TLS certificates.')

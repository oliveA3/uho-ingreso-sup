import http.client
import ipaddress
import socket
import ssl
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit


MAX_HTML_BYTES = 512 * 1024
MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_REDIRECTS = 3
REQUEST_TIMEOUT_SECONDS = 2
ALLOWED_PORTS = {"http": 80, "https": 443}
IMAGE_MIME_EXTENSIONS = {
    "image/jpeg": (".jpg", lambda data: data.startswith(b"\xff\xd8\xff")),
    "image/png": (".png", lambda data: data.startswith(b"\x89PNG\r\n\x1a\n")),
    "image/gif": (".gif", lambda data: data.startswith((b"GIF87a", b"GIF89a"))),
    "image/webp": (".webp", lambda data: len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP"),
}


class _OpenGraphParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.image_urls = []

    def handle_starttag(self, tag, attrs):
        if tag.lower() != "meta":
            return
        values = {key.lower(): value for key, value in attrs if key and value}
        key = values.get("property", "").lower() or values.get("name", "").lower()
        if key in {"og:image", "og:image:url", "twitter:image", "twitter:image:src"}:
            self.image_urls.append(values.get("content", ""))


def _resolve_public_ip(host, port):
    try:
        address = ipaddress.ip_address(host)
        addresses = {str(address)}
    except ValueError:
        records = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
        addresses = {record[4][0] for record in records}
    if not addresses or any(not ipaddress.ip_address(address).is_global for address in addresses):
        raise ValueError("External URL must resolve only to public IP addresses.")
    return sorted(addresses)[0]


def _validate_target(url):
    parsed = urlsplit(url)
    scheme = parsed.scheme.lower()
    if scheme not in ALLOWED_PORTS or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Unsupported external URL.")
    port = parsed.port or ALLOWED_PORTS[scheme]
    if port != ALLOWED_PORTS[scheme]:
        raise ValueError("External URL uses an unsupported port.")
    host = parsed.hostname.encode("idna").decode("ascii")
    address = _resolve_public_ip(host, port)
    return parsed, scheme, host, port, address


def _request_once(url, accept, byte_limit):
    parsed, scheme, host, port, address = _validate_target(url)
    connection_class = http.client.HTTPSConnection if scheme == "https" else http.client.HTTPConnection
    if scheme == "https":
        connection = connection_class(host, port, timeout=REQUEST_TIMEOUT_SECONDS, context=ssl.create_default_context())
    else:
        connection = connection_class(host, port, timeout=REQUEST_TIMEOUT_SECONDS)
    sock = socket.create_connection((address, port), timeout=REQUEST_TIMEOUT_SECONDS)
    if scheme == "https":
        sock = connection._context.wrap_socket(sock, server_hostname=host)
    connection.sock = sock
    path = parsed.path or "/"
    if parsed.query:
        path = f"{path}?{parsed.query}"
    try:
        connection.request("GET", path, headers={
            "Accept": accept,
            "Accept-Encoding": "identity",
            "Connection": "close",
            "User-Agent": "IngresoSUP-NewsPreview/1.0",
        })
        response = connection.getresponse()
        if response.status in {301, 302, 303, 307, 308}:
            return response.status, response.getheader("Location"), "", b""
        content_type = response.getheader("Content-Type", "").split(";", 1)[0].strip().lower()
        content_length = response.getheader("Content-Length")
        if content_length and int(content_length) > byte_limit:
            return response.status, None, content_type, b""
        return response.status, None, content_type, response.read(byte_limit + 1)
    finally:
        connection.close()


def _safe_get(url, accept, byte_limit):
    current = url
    initial_scheme = urlsplit(url).scheme.lower()
    for _ in range(MAX_REDIRECTS + 1):
        status, location, content_type, body = _request_once(current, accept, byte_limit)
        if status in {301, 302, 303, 307, 308}:
            if not location:
                return None
            current = urljoin(current, location)
            if initial_scheme == "https" and urlsplit(current).scheme.lower() != "https":
                return None
            continue
        if status != 200 or len(body) > byte_limit:
            return None
        return current, content_type, body
    return None


def fetch_open_graph_image(page_url):
    """Fetch and validate a small public raster image referenced by a page's OG metadata."""
    try:
        page = _safe_get(page_url, "text/html,application/xhtml+xml", MAX_HTML_BYTES)
        if not page or page[1] not in {"text/html", "application/xhtml+xml"}:
            return None
        parser = _OpenGraphParser()
        parser.feed(page[2].decode("utf-8", errors="replace"))
        for image_url in parser.image_urls[:2]:
            if not image_url:
                continue
            resolved_url = urljoin(page[0], image_url)
            image = _safe_get(resolved_url, "image/jpeg,image/png,image/webp,image/gif", MAX_IMAGE_BYTES)
            if not image:
                continue
            extension_and_check = IMAGE_MIME_EXTENSIONS.get(image[1])
            if not extension_and_check:
                continue
            extension, check_signature = extension_and_check
            if check_signature(image[2]):
                return image[2], extension
    except (OSError, ValueError, ssl.SSLError, http.client.HTTPException, UnicodeError):
        return None
    return None

from __future__ import annotations

import json
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
OFFICIAL_DOMAIN = "https://www.chateau-monlet.fr"
OLD_DOMAIN = "chateau-" + "de-monlet.fr"
FORMSPREE_ENDPOINT = "https://formspree.io/f/mjgdkgwz"
TEXT_SUFFIXES = {".html", ".css", ".js", ".json", ".xml", ".txt", ".md", ".yml", ".yaml", ".webmanifest", ""}
BINARY_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp", ".ico"}
EXTERNAL_SCHEMES = {"http", "https", "mailto", "tel", "data"}


class SiteParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tags: list[tuple[str, dict[str, str]]] = []
        self.ld_json_blocks: list[str] = []
        self._in_ld_json = False
        self._ld_json_parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attr_dict = {name.lower(): value or "" for name, value in attrs}
        self.tags.append((tag.lower(), attr_dict))
        if tag.lower() == "script" and attr_dict.get("type", "").lower() == "application/ld+json":
            self._in_ld_json = True
            self._ld_json_parts = []

    def handle_data(self, data: str) -> None:
        if self._in_ld_json:
            self._ld_json_parts.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "script" and self._in_ld_json:
            self.ld_json_blocks.append("".join(self._ld_json_parts).strip())
            self._in_ld_json = False
            self._ld_json_parts = []


def fail(message: str, errors: list[str]) -> None:
    errors.append(message)


def text_files() -> list[Path]:
    files = []
    for path in ROOT.rglob("*"):
        if not path.is_file() or ".git" in path.parts:
            continue
        if path.suffix.lower() in BINARY_SUFFIXES:
            continue
        if path.suffix.lower() in TEXT_SUFFIXES:
            files.append(path)
    return files


def is_external(reference: str) -> bool:
    parsed = urlparse(reference)
    return parsed.scheme in EXTERNAL_SCHEMES


def resolve_local(reference: str) -> Path | None:
    if not reference or reference.startswith("#") or is_external(reference):
        return None
    cleaned = reference.split("#", 1)[0].split("?", 1)[0]
    if not cleaned:
        return None
    if cleaned.startswith("/"):
        return ROOT / cleaned.lstrip("/")
    return None


def resolve_relative(reference: str, html_file: Path) -> Path | None:
    if not reference or reference.startswith("#") or is_external(reference):
        return None
    cleaned = reference.split("#", 1)[0].split("?", 1)[0]
    if not cleaned:
        return None
    if cleaned.startswith("/"):
        return ROOT / cleaned.lstrip("/")
    return html_file.parent / cleaned


def srcset_candidates(srcset: str) -> list[str]:
    candidates = []
    for item in srcset.split(","):
        value = item.strip().split()
        if value:
            candidates.append(value[0])
    return candidates


def scan_json_for_placeholders(value: object, path: str, html_name: str, errors: list[str]) -> None:
    if isinstance(value, dict):
        for key, nested in value.items():
            scan_json_for_placeholders(nested, f"{path}.{key}", html_name, errors)
    elif isinstance(value, list):
        for index, nested in enumerate(value):
            scan_json_for_placeholders(nested, f"{path}[{index}]", html_name, errors)
    elif isinstance(value, str) and value.strip().lower() in {"a completer", "à compléter"}:
        fail(f"JSON-LD placeholder in {html_name}: {path}", errors)


def validate_html(html_file: Path, errors: list[str]) -> None:
    parser = SiteParser()
    text = html_file.read_text(encoding="utf-8")
    parser.feed(text)

    ids = [attrs["id"] for _, attrs in parser.tags if "id" in attrs]
    for duplicated in sorted({item for item in ids if ids.count(item) > 1}):
        fail(f"Duplicate id in {html_file.name}: {duplicated}", errors)

    for block in parser.ld_json_blocks:
        try:
            data = json.loads(block)
        except json.JSONDecodeError as exc:
            fail(f"Invalid JSON-LD in {html_file.name}: {exc}", errors)
            continue
        scan_json_for_placeholders(data, "jsonld", html_file.name, errors)

    for tag, attrs in parser.tags:
        if "style" in attrs:
            fail(f"Inline style attribute in {html_file.name}: <{tag}>", errors)

        if tag == "meta" and attrs.get("http-equiv", "").lower() == "content-security-policy":
            unsafe_inline = "'unsafe-" + "inline'"
            if unsafe_inline in attrs.get("content", ""):
                fail(f"Unsafe inline CSP directive in {html_file.name}", errors)

        if (
            tag == "script"
            and "src" not in attrs
            and attrs.get("type", "").lower() != "application/ld+json"
        ):
            fail(f"Unexpected inline script in {html_file.name}", errors)

        if tag == "form" and attrs.get("action") != FORMSPREE_ENDPOINT:
            fail(f"Unexpected form action in {html_file.name}: {attrs.get('action')}", errors)

        if tag == "a" and attrs.get("target") == "_blank":
            rel = set(attrs.get("rel", "").split())
            if not {"noopener", "noreferrer"}.issubset(rel):
                fail(f"target=_blank without noopener noreferrer in {html_file.name}", errors)

        for attr in ("href", "src"):
            if attr not in attrs:
                continue
            target = resolve_relative(attrs[attr], html_file)
            if target and not target.exists():
                fail(f"Missing local {attr} in {html_file.name}: {attrs[attr]}", errors)

        if "srcset" in attrs:
            for candidate in srcset_candidates(attrs["srcset"]):
                target = resolve_relative(candidate, html_file)
                if target and not target.exists():
                    fail(f"Missing srcset file in {html_file.name}: {candidate}", errors)

        if tag == "meta" and attrs.get("property", "").startswith("og:image"):
            content = attrs.get("content", "")
            if content.startswith(OFFICIAL_DOMAIN):
                local = ROOT / content.removeprefix(OFFICIAL_DOMAIN).lstrip("/")
                if local.suffix and not local.exists():
                    fail(f"Missing local OG image in {html_file.name}: {content}", errors)

    for reference in re.findall(r"url\(['\"]?(/?assets/images/[^)'\" ]+)", text):
        target = ROOT / reference.lstrip("/")
        if not target.exists():
            fail(f"Missing CSS image in {html_file.name}: {reference}", errors)


def validate_sitemap(errors: list[str]) -> None:
    sitemap = ROOT / "sitemap.xml"
    try:
        tree = ET.parse(sitemap)
    except ET.ParseError as exc:
        fail(f"Invalid sitemap XML: {exc}", errors)
        return

    namespace = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    locs = [node.text or "" for node in tree.findall(".//sm:loc", namespace)]
    for loc in locs:
        if not loc.startswith(f"{OFFICIAL_DOMAIN}/"):
            fail(f"Unexpected sitemap URL: {loc}", errors)
            continue
        if loc == f"{OFFICIAL_DOMAIN}/":
            local = ROOT / "index.html"
        else:
            local = ROOT / loc.removeprefix(f"{OFFICIAL_DOMAIN}/")
        if not local.exists():
            fail(f"Sitemap points to missing file: {loc}", errors)

    if any(loc.endswith("/index.html") for loc in locs):
        fail("Sitemap contains /index.html", errors)
    if any("404.html" in loc for loc in locs):
        fail("Sitemap must not include 404.html", errors)


def validate_manifest(errors: list[str]) -> None:
    manifest_file = ROOT / "site.webmanifest"
    try:
        manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        fail(f"Invalid site.webmanifest: {exc}", errors)
        return

    if manifest.get("start_url") != "/":
        fail("Manifest start_url must be /", errors)
    for icon in manifest.get("icons", []):
        src = icon.get("src", "")
        target = resolve_local(src)
        if target and not target.exists():
            fail(f"Manifest icon missing: {src}", errors)


def validate_text_patterns(errors: list[str]) -> None:
    official_seen = False
    forbidden = {
        "console." + "log": "console." + "log found",
        "eval" + "(": "eval found",
        "inner" + "HTML": "inner" + "HTML found",
    }
    secret_patterns = [
        re.compile(r"AKIA[0-9A-Z]{16}"),
        re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
        re.compile(r"\\bghp_[A-Za-z0-9_]{20,}\\b"),
        re.compile(r"\\bsk-[A-Za-z0-9]{20,}\\b"),
    ]

    for path in text_files():
        text = path.read_text(encoding="utf-8", errors="ignore")
        relative = path.relative_to(ROOT).as_posix()
        if OLD_DOMAIN in text:
            fail(f"Old domain found in {relative}", errors)
        if "chateau-monlet.fr" in text:
            official_seen = True
        for needle, message in forbidden.items():
            if needle in text:
                fail(f"{message}: {relative}", errors)
        for pattern in secret_patterns:
            if pattern.search(text):
                fail(f"Possible secret in {relative}", errors)

    if not official_seen:
        fail("Official domain not found", errors)


def main() -> int:
    errors: list[str] = []

    validate_text_patterns(errors)
    validate_sitemap(errors)
    validate_manifest(errors)

    for html_file in sorted(ROOT.glob("*.html")):
        validate_html(html_file, errors)

    robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
    if f"Sitemap: {OFFICIAL_DOMAIN}/sitemap.xml" not in robots:
        fail("robots.txt does not reference the official sitemap", errors)

    if errors:
        print("FAIL")
        for error in errors:
            print(f"- {error}")
        return 1

    print("OK site checks")
    return 0


if __name__ == "__main__":
    sys.exit(main())

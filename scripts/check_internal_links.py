#!/usr/bin/env python3
"""Check links, assets, and fragments in a built MkDocs site."""

from __future__ import annotations

import argparse
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


IGNORED_SCHEMES = {"data", "javascript", "mailto", "tel"}


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: set[str] = set()
        self.references: list[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attributes = dict(attrs)
        element_id = attributes.get("id")
        if element_id:
            self.ids.add(element_id)

        if tag in {"a", "link"} and attributes.get("href"):
            self.references.append((f"{tag}[href]", attributes["href"]))
        if tag in {"img", "script"} and attributes.get("src"):
            self.references.append((f"{tag}[src]", attributes["src"]))
        if tag == "source" and attributes.get("srcset"):
            for candidate in attributes["srcset"].split(","):
                url = candidate.strip().split()[0]
                if url:
                    self.references.append(("source[srcset]", url))


def parse_page(path: Path) -> PageParser:
    parser = PageParser()
    parser.feed(path.read_text(encoding="utf-8"))
    return parser


def resolve_target(site_dir: Path, source: Path, raw_url: str) -> tuple[Path | None, str]:
    parsed = urlsplit(raw_url)
    if parsed.scheme.lower() in IGNORED_SCHEMES or parsed.scheme or parsed.netloc:
        return None, ""
    if raw_url.startswith("//"):
        return None, ""

    fragment = unquote(parsed.fragment)
    url_path = unquote(parsed.path)
    if not url_path:
        return source, fragment

    if url_path.startswith("/"):
        target = site_dir / url_path.lstrip("/")
    else:
        target = source.parent / url_path

    target = target.resolve()
    site_root = site_dir.resolve()
    try:
        target.relative_to(site_root)
    except ValueError:
        return target, fragment

    if url_path.endswith("/") or target.is_dir():
        target = target / "index.html"
    elif not target.suffix and not target.exists():
        target = target / "index.html"

    return target, fragment


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("site_dir", nargs="?", default="site")
    args = parser.parse_args()

    site_dir = Path(args.site_dir).resolve()
    if not site_dir.is_dir():
        parser.error(f"site directory does not exist: {site_dir}")

    pages = sorted(site_dir.rglob("*.html"))
    parsed_pages = {page: parse_page(page) for page in pages}
    errors: list[str] = []

    for source, page in parsed_pages.items():
        for kind, raw_url in page.references:
            target, fragment = resolve_target(site_dir, source, raw_url)
            if target is None:
                continue
            try:
                relative_target = target.relative_to(site_dir)
            except ValueError:
                errors.append(
                    f"{source.relative_to(site_dir)}: {kind} escapes site root: {raw_url}"
                )
                continue
            if not target.exists():
                errors.append(
                    f"{source.relative_to(site_dir)}: {kind} missing "
                    f"{relative_target}: {raw_url}"
                )
                continue
            if fragment and target.suffix.lower() == ".html":
                target_page = parsed_pages.get(target)
                if target_page is None:
                    target_page = parse_page(target)
                    parsed_pages[target] = target_page
                if fragment not in target_page.ids:
                    errors.append(
                        f"{source.relative_to(site_dir)}: fragment #{fragment} "
                        f"missing in {relative_target}: {raw_url}"
                    )

    if errors:
        print(f"Found {len(errors)} broken internal reference(s):")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"Checked {len(pages)} HTML pages: no broken internal references.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

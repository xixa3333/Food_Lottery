"""Food Lottery command-line app using free OpenStreetMap APIs."""

from __future__ import annotations

import argparse
import json
import random
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass

USER_AGENT = "FoodLottery/2.0 (+https://github.com/xixa3333/Food_Lottery)"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OVERPASS_URL = "https://overpass-api.de/api/interpreter"


class ApiError(RuntimeError):
    pass


@dataclass(frozen=True)
class Venue:
    name: str
    category: str
    latitude: float
    longitude: float
    rating: float | None = None
    website: str | None = None

    @property
    def map_url(self) -> str:
        return f"https://www.openstreetmap.org/?mlat={self.latitude}&mlon={self.longitude}#map=18/{self.latitude}/{self.longitude}"


def _get_json(url: str, *, data: bytes | None = None) -> object:
    request = urllib.request.Request(url, data=data, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise ApiError(f"公共 API 連線失敗：{exc}") from exc


def geocode(location: str) -> tuple[float, float, str]:
    query = urllib.parse.urlencode({"q": location, "format": "jsonv2", "limit": 1})
    payload = _get_json(f"{NOMINATIM_URL}?{query}")
    if not isinstance(payload, list) or not payload:
        raise ApiError(f"找不到地點：{location}")
    result = payload[0]
    return float(result["lat"]), float(result["lon"]), str(result.get("display_name", location))


def build_overpass_query(latitude: float, longitude: float, radius: int) -> str:
    return f'''[out:json][timeout:25];
(
  nwr["amenity"~"^(restaurant|fast_food|cafe|food_court)$"](around:{radius},{latitude},{longitude});
);
out center tags;'''


def parse_venues(payload: object) -> list[Venue]:
    if not isinstance(payload, dict):
        return []
    venues: list[Venue] = []
    for element in payload.get("elements", []):
        tags = element.get("tags", {})
        name = tags.get("name") or tags.get("name:zh")
        center = element.get("center", element)
        if not name or "lat" not in center or "lon" not in center:
            continue
        try:
            rating = float(tags["rating"]) if "rating" in tags else None
        except (TypeError, ValueError):
            rating = None
        venues.append(Venue(
            name=str(name), category=str(tags.get("cuisine") or tags.get("amenity") or "food"),
            latitude=float(center["lat"]), longitude=float(center["lon"]), rating=rating,
            website=tags.get("website") or tags.get("contact:website"),
        ))
    return venues


def fetch_venues(latitude: float, longitude: float, radius: int) -> list[Venue]:
    query = build_overpass_query(latitude, longitude, radius)
    data = urllib.parse.urlencode({"data": query}).encode()
    return parse_venues(_get_json(OVERPASS_URL, data=data))


def filter_venues(venues: list[Venue], keyword: str, min_rating: float) -> list[Venue]:
    needle = keyword.casefold().strip()
    return [venue for venue in venues if
            (not needle or needle in f"{venue.name} {venue.category}".casefold()) and
            (venue.rating is not None and venue.rating >= min_rating if min_rating > 0 else True)]


def make_parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="搜尋附近餐廳並隨機推薦")
    result.add_argument("--location", help="地名或地址")
    result.add_argument("--keyword", default="", help="店名或料理關鍵字")
    result.add_argument("--min-rating", type=float, default=0, help="最低評分（0-5）")
    result.add_argument("--radius", type=int, default=3000, help="搜尋半徑（公尺）")
    result.add_argument("--seed", type=int, help="固定隨機種子")
    return result


def main(argv: list[str] | None = None) -> int:
    args = make_parser().parse_args(argv)
    interactive = args.location is None
    location = args.location or input("搜尋地點：").strip()
    keyword = input("想吃什麼（可留空）：").strip() if interactive else args.keyword
    if not location or not 0 <= args.min_rating <= 5 or not 100 <= args.radius <= 20_000:
        print("輸入無效：請提供地點；評分須為 0-5，半徑須為 100-20000。", file=sys.stderr)
        return 2
    try:
        latitude, longitude, display_name = geocode(location)
        matches = filter_venues(fetch_venues(latitude, longitude, args.radius), keyword, args.min_rating)
    except ApiError as exc:
        print(exc, file=sys.stderr)
        return 1
    if not matches:
        print("找不到符合條件的餐廳；可嘗試清空關鍵字、降低評分或加大半徑。")
        return 1
    chosen = random.Random(args.seed).choice(matches)
    rating = f"{chosen.rating:g} / 5" if chosen.rating is not None else "未提供"
    print(f"搜尋中心：{display_name}\n符合：{len(matches)} 間\n\n抽中：{chosen.name}\n類型：{chosen.category}\n評分：{rating}\n地圖：{chosen.map_url}")
    if chosen.website:
        print(f"網站：{chosen.website}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

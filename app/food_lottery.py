"""Food Lottery desktop GUI and reusable OpenStreetMap client."""

from __future__ import annotations

import json
import random
import threading
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from dataclasses import dataclass

USER_AGENT = "FoodLottery/2.1 (+https://github.com/xixa3333/Food_Lottery)"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OVERPASS_URLS = (
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.nchc.org.tw/api/interpreter",
)
IP_LOCATION_URL = "https://ipwho.is/"


class ApiError(RuntimeError):
    """A public API request could not be completed."""


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
        return (
            "https://www.openstreetmap.org/"
            f"?mlat={self.latitude}&mlon={self.longitude}"
            f"#map=18/{self.latitude}/{self.longitude}"
        )


def get_json(url: str, *, data: bytes | None = None) -> object:
    request = urllib.request.Request(url, data=data, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.load(response)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise ApiError(f"公共 API 連線失敗：{exc}") from exc


def locate_by_network() -> tuple[float, float, str]:
    """Approximate the current device position from its public network address."""
    payload = get_json(IP_LOCATION_URL)
    if not isinstance(payload, dict) or not payload.get("success"):
        raise ApiError("無法取得目前裝置位置")
    latitude = float(payload["latitude"])
    longitude = float(payload["longitude"])
    label = ", ".join(
        str(payload.get(key)) for key in ("city", "region", "country") if payload.get(key)
    )
    return latitude, longitude, label or "目前位置"


def geocode(location: str) -> tuple[float, float, str]:
    query = urllib.parse.urlencode({"q": location, "format": "jsonv2", "limit": 1})
    payload = get_json(f"{NOMINATIM_URL}?{query}")
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
        venues.append(
            Venue(
                name=str(name),
                category=str(tags.get("cuisine") or tags.get("amenity") or "food"),
                latitude=float(center["lat"]),
                longitude=float(center["lon"]),
                rating=rating,
                website=tags.get("website") or tags.get("contact:website"),
            )
        )
    return venues


def fetch_venues(latitude: float, longitude: float, radius: int) -> list[Venue]:
    data = urllib.parse.urlencode(
        {"data": build_overpass_query(latitude, longitude, radius)}
    ).encode()
    last_error: ApiError | None = None
    for endpoint in OVERPASS_URLS:
        try:
            return parse_venues(get_json(endpoint, data=data))
        except ApiError as exc:
            last_error = exc
    raise ApiError(f"餐廳資料服務目前忙碌中，請稍後重試。{last_error or ''}")


def filter_venues(venues: list[Venue], keyword: str, min_rating: float) -> list[Venue]:
    needle = keyword.casefold().strip()
    return [
        venue
        for venue in venues
        if (not needle or needle in f"{venue.name} {venue.category}".casefold())
        and (min_rating <= 0 or venue.rating is not None and venue.rating >= min_rating)
    ]


def run_gui() -> None:
    import tkinter as tk
    from tkinter import messagebox, ttk

    root = tk.Tk()
    root.title("Food Lottery 食物抽籤器")
    root.geometry("560x470")
    root.minsize(500, 430)

    location = tk.StringVar()
    keyword = tk.StringVar()
    min_rating = tk.StringVar(value="0")
    radius = tk.StringVar(value="3000")
    status = tk.StringVar(value="正在取得目前裝置位置…")
    coordinates: list[float] = []
    detected_location: list[str] = []
    current_choice: list[Venue] = []

    frame = ttk.Frame(root, padding=22)
    frame.pack(fill="both", expand=True)
    ttk.Label(frame, text="Food Lottery", font=("Segoe UI", 21, "bold")).pack(anchor="w")
    ttk.Label(frame, text="使用目前位置搜尋附近餐廳，或自行輸入地點").pack(anchor="w", pady=(0, 18))

    form = ttk.Frame(frame)
    form.pack(fill="x")
    for row, (label, variable) in enumerate(
        (("位置", location), ("想吃什麼", keyword), ("最低評分 0–5", min_rating), ("半徑（公尺）", radius))
    ):
        ttk.Label(form, text=label).grid(row=row, column=0, sticky="w", pady=5)
        ttk.Entry(form, textvariable=variable).grid(row=row, column=1, sticky="ew", padx=(12, 0), pady=5)
    form.columnconfigure(1, weight=1)

    ttk.Label(frame, textvariable=status, foreground="#555").pack(anchor="w", pady=12)
    result = tk.Text(frame, height=7, wrap="word", state="disabled", font=("Segoe UI", 11))
    result.pack(fill="both", expand=True)

    def set_result(text: str) -> None:
        result.configure(state="normal")
        result.delete("1.0", "end")
        result.insert("1.0", text)
        result.configure(state="disabled")

    def detect_location() -> None:
        try:
            lat, lon, label = locate_by_network()
            coordinates[:] = [lat, lon]
            detected_location[:] = [label]
            root.after(0, lambda: location.set(label))
            root.after(0, lambda: status.set("已使用目前裝置的網路位置；可手動修改位置"))
        except ApiError:
            root.after(0, lambda: status.set("無法自動定位，請輸入城市、區域或地址"))
            root.after(0, lambda: messagebox.showinfo("需要位置", "無法取得目前位置，請在「位置」欄輸入城市、區域或地址。"))

    def search_worker() -> None:
        try:
            rating_value = float(min_rating.get())
            radius_value = int(radius.get())
            if not 0 <= rating_value <= 5 or not 100 <= radius_value <= 20_000:
                raise ValueError
            typed_location = location.get().strip()
            if coordinates and detected_location and typed_location == detected_location[0]:
                lat, lon, label = coordinates[0], coordinates[1], typed_location or "目前位置"
            elif typed_location:
                lat, lon, label = geocode(typed_location)
            else:
                root.after(0, lambda: messagebox.showwarning("需要位置", "請允許定位或輸入位置後再搜尋。"))
                return
            matches = filter_venues(fetch_venues(lat, lon, radius_value), keyword.get(), rating_value)
            if not matches:
                root.after(0, lambda: set_result("找不到符合條件的餐廳，請清空關鍵字、降低評分或加大半徑。"))
                return
            chosen = random.choice(matches)
            current_choice[:] = [chosen]
            rating_text = f"{chosen.rating:g} / 5" if chosen.rating is not None else "未提供"
            text = f"搜尋中心：{label}\n符合：{len(matches)} 間\n\n抽中：{chosen.name}\n類型：{chosen.category}\n評分：{rating_text}"
            root.after(0, lambda: set_result(text))
            root.after(0, lambda: open_button.configure(state="normal"))
        except ValueError:
            root.after(0, lambda: messagebox.showerror("輸入錯誤", "評分須為 0–5，半徑須為 100–20000。"))
        except ApiError as exc:
            root.after(0, lambda: messagebox.showerror("搜尋失敗", str(exc)))
        finally:
            root.after(0, lambda: search_button.configure(state="normal"))
            root.after(0, lambda: status.set("搜尋完成"))

    def start_search() -> None:
        search_button.configure(state="disabled")
        status.set("正在搜尋附近餐廳…")
        threading.Thread(target=search_worker, daemon=True).start()

    buttons = ttk.Frame(frame)
    buttons.pack(fill="x", pady=(12, 0))
    search_button = ttk.Button(buttons, text="幫我抽一間", command=start_search)
    search_button.pack(side="left")
    open_button = ttk.Button(
        buttons,
        text="在地圖開啟",
        state="disabled",
        command=lambda: webbrowser.open(current_choice[0].map_url) if current_choice else None,
    )
    open_button.pack(side="left", padx=8)

    threading.Thread(target=detect_location, daemon=True).start()
    root.mainloop()


if __name__ == "__main__":
    run_gui()

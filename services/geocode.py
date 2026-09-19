import os
import httpx

OPENTRIPMAP_KEY = os.getenv("OPENTRIPMAP_API_KEY")
BASE_URL = "https://api.opentripmap.com/0.1/en/places/geoname"

async def geocode_place(place_name: str) -> dict:
    """Returns {'name', 'lat', 'lon'} for a place name."""
    params = {"name": place_name, "apikey": OPENTRIPMAP_KEY}
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(BASE_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    if "lat" not in data or "lon" not in data:
        raise ValueError(f"Could not geocode '{place_name}'")

    return {"name": data.get("name", place_name), "lat": data["lat"], "lon": data["lon"]}
import os
import httpx

TOMTOM_KEY = os.getenv("TOMTOM_API_KEY")

async def get_traffic_route(origin: dict, destination: dict) -> dict:
    """Returns duration (min) including live traffic."""
    coords = f"{origin['lat']},{origin['lon']}:{destination['lat']},{destination['lon']}"
    url = f"https://api.tomtom.com/routing/1/calculateRoute/{coords}/json"
    params = {"key": TOMTOM_KEY, "traffic": "true"}

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url, params=params)
        resp.raise_for_status()
        data = resp.json()

    if not data.get("routes"):
        raise ValueError("TomTom could not compute a route")

    summary = data["routes"][0]["summary"]
    return {
        "duration_min": round(summary["travelTimeInSeconds"] / 60, 1),
        "traffic_delay_min": round(summary.get("trafficDelayInSeconds", 0) / 60, 1),
    }
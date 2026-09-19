import httpx


OSRM_BASE_URL = (
    "http://router.project-osrm.org/route/v1/driving"
)


def build_google_maps_route_url(
    origin: dict,
    destination: dict
) -> str:
    """
    Build a Google Maps driving directions URL
    using the already-resolved coordinates.
    """

    origin_lat = origin["lat"]
    origin_lon = origin["lon"]

    destination_lat = destination["lat"]
    destination_lon = destination["lon"]

    return (
        "https://www.google.com/maps/dir/?api=1"
        f"&origin={origin_lat},{origin_lon}"
        f"&destination={destination_lat},{destination_lon}"
        "&travelmode=driving"
    )


async def get_route(
    origin: dict,
    destination: dict
) -> dict:
    """
    origin/destination are:
    {
        'lat': ...,
        'lon': ...
    }

    Returns:
    - distance_km
    - duration_min
    - geometry
    - maps_url
    """

    coords = (
        f"{origin['lon']},{origin['lat']};"
        f"{destination['lon']},{destination['lat']}"
    )

    url = (
        f"{OSRM_BASE_URL}/{coords}"
    )

    params = {
        "overview": "full",
        "geometries": "geojson",
    }

    async with httpx.AsyncClient(
        timeout=15
    ) as client:

        resp = await client.get(
            url,
            params=params
        )

        resp.raise_for_status()

        data = resp.json()

    if (
        data.get("code") != "Ok"
        or not data.get("routes")
    ):
        raise ValueError(
            "OSRM could not compute a route"
        )

    route = data["routes"][0]

    maps_url = build_google_maps_route_url(
        origin,
        destination
    )

    return {
        "distance_km": round(
            route["distance"] / 1000,
            1
        ),

        "duration_min": round(
            route["duration"] / 60,
            1
        ),

        "geometry": route[
            "geometry"
        ]["coordinates"],

        "maps_url":
            maps_url,
    }
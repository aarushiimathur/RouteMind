import os
import httpx


OPENTRIPMAP_KEY = os.getenv(
    "OPENTRIPMAP_API_KEY"
)

BASE_URL = (
    "https://api.opentripmap.com/0.1/en/places/radius"
)


def build_google_maps_poi_url(
    lat: float,
    lon: float
) -> str:
    """
    Build a Google Maps single-location URL
    using latitude and longitude.
    """

    return (
        "https://www.google.com/maps/search/"
        "?api=1"
        f"&query={lat},{lon}"
    )


async def get_nearby_pois(
    lat: float,
    lon: float,
    kinds: str,
    radius_m: int = 3000,
    limit: int = 5
) -> list:

    params = {
        "radius": radius_m,
        "lon": lon,
        "lat": lat,
        "kinds": kinds,
        "limit": limit,
        "apikey": OPENTRIPMAP_KEY,
    }

    async with httpx.AsyncClient(
        timeout=10
    ) as client:

        resp = await client.get(
            BASE_URL,
            params=params
        )

        resp.raise_for_status()

        data = resp.json()

    results = []

    for feature in data.get(
        "features",
        []
    ):

        props = feature["properties"]

        coords = feature[
            "geometry"
        ]["coordinates"]

        poi_lat = coords[1]
        poi_lon = coords[0]

        results.append({

            "name":
                props.get(
                    "name",
                    "Unnamed"
                ),

            "kind":
                props.get(
                    "kinds",
                    ""
                ),

            "lon":
                poi_lon,

            "lat":
                poi_lat,

            "maps_url":
                build_google_maps_poi_url(
                    poi_lat,
                    poi_lon
                ),
        })

    return results
import math

from services.geocode import geocode_place
from services.osrm import get_route
from services.tomtom import get_traffic_route
from services.opentripmap_poi import get_nearby_pois


def _haversine_km(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
) -> float:
    """Calculate distance between two coordinates in km."""

    earth_radius_km = 6371.0

    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)

    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad)
        * math.cos(lat2_rad)
        * math.sin(delta_lon / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )

    return earth_radius_km * c


def _get_break_count(
    distance_km: float,
    duration_min: float
) -> int:
    """
    Estimate the number of recommended breaks.

    Rule:
    - roughly one break every 2–2.5 hours
    - roughly one break every 150–200 km
    """

    duration_hours = duration_min / 60

    breaks_by_time = int(
        duration_hours // 2.5
    )

    breaks_by_distance = int(
        distance_km // 200
    )

    num_breaks = max(
        breaks_by_time,
        breaks_by_distance
    )

    # If the trip is already reasonably long,
    # make sure at least one break is suggested.
    if (
        duration_hours >= 2
        or distance_km >= 150
    ):
        num_breaks = max(
            1,
            num_breaks
        )

    return num_breaks


def _sample_route_points(
    geometry: list,
    num_points: int
) -> list:
    """
    Find approximately evenly spaced points
    along the actual OSRM route geometry.

    geometry format:
    [
        [lon, lat],
        [lon, lat],
        ...
    ]
    """

    if (
        num_points <= 0
        or not geometry
    ):
        return []

    if len(geometry) < 2:
        return []

    # Calculate cumulative distance along route.
    cumulative_distances = [0.0]

    for i in range(1, len(geometry)):

        lon1, lat1 = geometry[i - 1]
        lon2, lat2 = geometry[i]

        segment_distance = _haversine_km(
            lat1,
            lon1,
            lat2,
            lon2
        )

        cumulative_distances.append(
            cumulative_distances[-1]
            + segment_distance
        )

    total_distance = cumulative_distances[-1]

    if total_distance <= 0:
        return []

    sampled_points = []

    # Divide the route into equal sections.
    # We intentionally avoid the origin and destination.
    for i in range(1, num_points + 1):

        target_distance = (
            total_distance
            * i
            / (num_points + 1)
        )

        for j in range(
            1,
            len(cumulative_distances)
        ):

            if (
                cumulative_distances[j]
                >= target_distance
            ):
                previous_distance = (
                    cumulative_distances[j - 1]
                )

                segment_distance = (
                    cumulative_distances[j]
                    - previous_distance
                )

                if segment_distance == 0:
                    ratio = 0
                else:
                    ratio = (
                        target_distance
                        - previous_distance
                    ) / segment_distance

                lon1, lat1 = geometry[j - 1]
                lon2, lat2 = geometry[j]

                sampled_lon = (
                    lon1
                    + (lon2 - lon1) * ratio
                )

                sampled_lat = (
                    lat1
                    + (lat2 - lat1) * ratio
                )

                sampled_points.append({
                    "lat": round(
                        sampled_lat,
                        6
                    ),
                    "lon": round(
                        sampled_lon,
                        6
                    ),
                    "distance_from_origin_km":
                        round(
                            target_distance,
                            1
                        ),
                })

                break

    return sampled_points


async def _find_break_options(
    geometry: list,
    num_breaks: int
) -> list:
    """
    Search for fuel, food and washroom options
    around evenly spaced points on the route.
    """

    sampled_points = _sample_route_points(
        geometry,
        num_breaks
    )

    break_options = []

    for index, point in enumerate(
        sampled_points,
        start=1
    ):

        lat = point["lat"]
        lon = point["lon"]

        fuel = await get_nearby_pois(
            lat,
            lon,
            "fuel",
            radius_m=5000,
            limit=5
        )

        food = await get_nearby_pois(
            lat,
            lon,
            "foods",
            radius_m=5000,
            limit=5
        )

        toilets = await get_nearby_pois(
            lat,
            lon,
            "toilets",
            radius_m=5000,
            limit=5
        )

        break_options.append({

            "break_number":
                index,

            "approx_distance_from_origin_km":
                point[
                    "distance_from_origin_km"
                ],

            "location": {
                "lat": lat,
                "lon": lon
            },

            "fuel_options":
                fuel,

            "food_options":
                food,

            "washroom_options":
                toilets,
        })

    return break_options


async def tool_geocode(
    place_name: str
) -> dict:

    result = await geocode_place(
        place_name
    )

    return result


async def tool_get_route_summary(
    origin_name: str,
    destination_name: str
) -> dict:

    origin = await geocode_place(
        origin_name
    )

    destination = await geocode_place(
        destination_name
    )

    route = await get_route(
        origin,
        destination
    )

    distance_km = route[
        "distance_km"
    ]

    duration_min = route[
        "duration_min"
    ]

    num_breaks = _get_break_count(
        distance_km,
        duration_min
    )

    break_options = []

    if num_breaks > 0:
        break_options = await _find_break_options(
            route["geometry"],
            num_breaks
        )

    return {

        "origin":
            origin,

        "destination":
            destination,

        "distance_km":
            distance_km,

        "duration_min":
            duration_min,

        "maps_url":
            route["maps_url"],

        "recommended_breaks":
            num_breaks,

        "break_options":
            break_options,
    }


async def tool_get_traffic_delta(
    origin_name: str,
    destination_name: str
) -> dict:

    origin = await geocode_place(
        origin_name
    )

    destination = await geocode_place(
        destination_name
    )

    return await get_traffic_route(
        origin,
        destination
    )


async def tool_search_pois(
    lat: float,
    lon: float,
    kind: str,
    radius_m: int = 5000
) -> list:

    return await get_nearby_pois(
        lat,
        lon,
        kind,
        radius_m=radius_m,
        limit=8
    )


TOOLS = [

    {
        "type": "function",

        "function": {

            "name":
                "geocode_place",

            "description":
                "Convert a place name into latitude/longitude coordinates.",

            "parameters": {

                "type":
                    "object",

                "properties": {

                    "place_name": {
                        "type":
                            "string"
                    }

                },

                "required": [
                    "place_name"
                ],
            },
        },
    },

    {
        "type": "function",

        "function": {

            "name":
                "get_route_summary",

            "description":
                (
                    "Get driving distance, duration, "
                    "coordinates, Google Maps route URL, "
                    "and automatically suggested break "
                    "locations based on trip duration "
                    "and distance. Break locations include "
                    "fuel, food and washroom options."
                ),

            "parameters": {

                "type":
                    "object",

                "properties": {

                    "origin_name": {
                        "type":
                            "string"
                    },

                    "destination_name": {
                        "type":
                            "string"
                    },
                },

                "required": [
                    "origin_name",
                    "destination_name"
                ],
            },
        },
    },

    {
        "type": "function",

        "function": {

            "name":
                "get_traffic_delta",

            "description":
                (
                    "Get live traffic-adjusted "
                    "driving duration and delay "
                    "between two named places."
                ),

            "parameters": {

                "type":
                    "object",

                "properties": {

                    "origin_name": {
                        "type":
                            "string"
                    },

                    "destination_name": {
                        "type":
                            "string"
                    },
                },

                "required": [
                    "origin_name",
                    "destination_name"
                ],
            },
        },
    },

    {
        "type": "function",

        "function": {

            "name":
                "search_pois",

            "description":
                (
                    "Find nearby points of interest "
                    "around a coordinate. "
                    "Each result includes a Google Maps "
                    "URL. kind must be fuel, foods, "
                    "accomodations, or toilets."
                ),

            "parameters": {

                "type":
                    "object",

                "properties": {

                    "lat": {
                        "type":
                            "number"
                    },

                    "lon": {
                        "type":
                            "number"
                    },

                    "kind": {

                        "type":
                            "string",

                        "enum": [
                            "fuel",
                            "foods",
                            "accomodations",
                            "toilets"
                        ]
                    },

                    "radius_m": {
                        "type":
                            "integer"
                    },
                },

                "required": [
                    "lat",
                    "lon",
                    "kind"
                ],
            },
        },
    },
]
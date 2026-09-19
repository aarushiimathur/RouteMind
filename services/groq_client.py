import os

from dotenv import load_dotenv
from google import genai
from google.genai import types

from services.tools import (
    tool_geocode,
    tool_get_route_summary,
    tool_get_traffic_delta,
    tool_search_pois,
)

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is missing from the .env file."
    )

MODEL = "gemini-3.5-flash-lite"

client = genai.Client(
    api_key=GEMINI_API_KEY
)


SYSTEM_PROMPT = """You are Route Agent, a friendly India road-trip planning assistant.
Talk naturally, like a helpful travel-savvy friend, not a form.

=========================================================
TRIP INFORMATION
=========================================================

Before planning a trip, make sure you have:

1. An exact starting point.
2. An exact destination.
3. Number and type of travelers.
4. Trip duration.

If the user provides only a city or region as the origin or destination,
ask for the specific place, hotel, landmark, address, or other precise
starting/destination point.

If group size is vague, ask for the number of travelers. Never guess.

If the trip duration is missing, ask how many days the trip should take.

If ANY required information is missing, ask only for the missing information.

Once ALL required information is available, immediately start planning.


=========================================================
TOOLS
=========================================================

Use the tools to get:

- route distance
- driving duration
- traffic information
- nearby points of interest

When suggesting stops, use the actual names returned by the tools.

Never invent POI names.

Only recommend actual places returned by the tools.

Do not present safety or family-friendliness as verified facts.

For groups with children, prefer stops with food and toilets nearby.

For women traveling alone or in a women-only group, prefer busier,
well-known stops over isolated ones.

These are general planning preferences, not verified safety ratings.


=========================================================
ROUTE TOOL RULE
=========================================================

IMPORTANT:

Once get_route_summary successfully returns a route for the user's
origin and destination, ACCEPT that route result.

Do NOT call get_route_summary again using alternate spellings,
shorter names, nearby places, cities, beaches, landmarks, or
different versions of the same origin/destination.

Do NOT repeatedly geocode the same locations after a successful
route has already been obtained.

For example, if the user provides:

"Club Mahindra Emerald Palms, Varca, Goa"

do not retry with:

"Varca Goa"
"Varca"
"Varca Beach"
"Goa"

Likewise, if the destination has already been successfully resolved,
do not retry with:

"Ahmedabad"
"Ahmedabad Gujarat"
"Vaishnodevi Circle"
or another nearby location.

Use the first successful route result as the authoritative route
for the itinerary.

Only call get_route_summary again if the user explicitly changes
the origin or destination.


=========================================================
MULTIPLE BREAK STOPS
=========================================================

The get_route_summary tool automatically calculates recommended breaks
based on the total driving distance and duration.

The route result may contain:

recommended_breaks

and:

break_options

Each break option represents an approximate point along the actual
driving route.

Each break option may contain:

- break_number
- approx_distance_from_origin_km
- location
- fuel_options
- food_options
- washroom_options

These break options have already been searched along the route.

IMPORTANT:

Use the returned break_options directly.

Do NOT call get_route_summary again to find break locations.

Do NOT replace the returned break locations with invented locations.

Do NOT search only around the final destination.

For long trips, distribute stops across the journey.

Use the approximate distance from the origin to understand where each
break belongs.

For example:

Break 1 = earlier part of journey
Break 2 = middle part of journey
Break 3 = later part of journey

Choose actual POIs from the relevant break_options.

Do not use every POI returned.

Normally select:

- one useful fuel stop when fuel is needed
- one food/lunch stop when appropriate
- washroom options when useful

If a suitable option is not available, do not invent one.


=========================================================
GOOGLE MAPS LINKS
=========================================================

Route results may contain a Google Maps URL in:

maps_url

POI results may also contain a Google Maps URL in:

maps_url

When a maps_url is available, ALWAYS include it.

For route information:

LINK: <maps_url>

For every LUNCH, FUEL, WASHROOM, OPTIONAL, and OVERNIGHT stop:

<STOP TYPE>
<actual POI name>
<short useful description or location>
LINK: <maps_url>

Only use maps_url values returned by tools.

NEVER invent a Google Maps URL.

Do not modify or rewrite maps_url values.


=========================================================
DO NOT OVERLOAD THE ITINERARY
=========================================================

For each day, normally include:

- 1 food/lunch stop
- 1–2 fuel/break stops when the journey is long enough
- 1 overnight stop when required
- 0–1 optional sightseeing stop

Do not list every POI returned by the tools.

Keep the itinerary concise.


=========================================================
IMPORTANT PLANNING RULE
=========================================================

Use the successful route result to determine:

- total distance
- total driving duration
- route
- break locations

For a multi-day trip, divide the journey into realistic daily segments.

Do not call get_route_summary repeatedly for every day.

The original route result is the authoritative route.

Use sensible intermediate areas based on the route and returned
break locations.

Use actual POIs returned by the tools.


=========================================================
TRAFFIC
=========================================================

If traffic information is available:

TRAFFIC
<brief traffic information>

Do not invent traffic conditions.


=========================================================
RESPONSE FORMAT
=========================================================

When all required trip information is available, ALWAYS return:

TRIP
<origin> → <destination>
<total distance> km • <total driving duration> • <number of days> Days
LINK: <route maps_url>


DAY 1
<starting area> → <main destination/overnight area>
<distance> km • <driving duration>

LUNCH
<actual POI name>
<short useful description or location>
LINK: <maps_url>

FUEL
<actual POI name>
<short useful description or location>
LINK: <maps_url>

FUEL
<actual POI name>
<short useful description or location>
LINK: <maps_url>

OPTIONAL
<actual POI name>
<short useful description or location>
LINK: <maps_url>

OVERNIGHT
<actual accommodation/area name>
<short useful description>
LINK: <maps_url>


DAY 2
<starting area> → <main destination/overnight area>
<distance> km • <driving duration>

LUNCH
<actual POI name>
<short useful description or location>
LINK: <maps_url>

FUEL
<actual POI name>
<short useful description or location>
LINK: <maps_url>

OPTIONAL
<actual POI name>
<short useful description or location>
LINK: <maps_url>

OVERNIGHT
<actual accommodation/area name>
<short useful description>
LINK: <maps_url>


Continue the same structure for additional days.


For the final day:

DAY X
<starting area> → <destination>
<distance> km • <driving duration>

LUNCH
<actual POI name>
<short useful description or location>
LINK: <maps_url>

OPTIONAL
<actual POI name>
<short useful description or location>
LINK: <maps_url>

ARRIVAL
<exact destination>


=========================================================
STOP CATEGORIES
=========================================================

LUNCH
Food/rest stop.

FUEL
Fuel stop.

WASHROOM
Washroom/toilet stop.

OPTIONAL
Sightseeing or non-essential stop.

OVERNIGHT
Overnight accommodation or area.

ARRIVAL
Final destination.


=========================================================
STYLE
=========================================================

Do not use Markdown headings.

Do not use bullet points inside the itinerary.

Do not return JSON.

Do not return raw tool results.

Keep the itinerary concise.

The itinerary should be the main response.

After the itinerary, write one short sentence:

Want me to swap any stops or adjust the pace?


=========================================================
MISSING INFORMATION
=========================================================

If information is missing, do not use the TRIP/DAY format.

Simply ask the missing question.


=========================================================
FINAL RULE
=========================================================

The final answer must contain the exact section labels where applicable:

TRIP
DAY
LUNCH
FUEL
WASHROOM
OPTIONAL
OVERNIGHT
TRAFFIC
ARRIVAL
LINK

Do not add Markdown symbols before these labels.

Do not use bullet points inside the itinerary.

Always include LINK when a maps_url is available.
"""


# =========================================================
# TOOL DECLARATIONS
# =========================================================

FUNCTION_DECLARATIONS = [

    types.FunctionDeclaration(
        name="geocode_place",
        description=(
            "Convert a place name into latitude and longitude "
            "coordinates. Use this only when a location needs "
            "to be resolved."
        ),
        parameters_json_schema={
            "type": "object",
            "properties": {
                "place_name": {
                    "type": "string",
                    "description": (
                        "Exact place, address, hotel, landmark, "
                        "or location name."
                    ),
                }
            },
            "required": [
                "place_name"
            ],
        },
    ),

    types.FunctionDeclaration(
        name="get_route_summary",
        description=(
            "Get the driving distance, driving duration, "
            "origin and destination coordinates, Google Maps "
            "route URL, recommended number of breaks, and "
            "break options sampled along the actual driving "
            "route. Break options contain fuel, food and "
            "washroom POIs."
        ),
        parameters_json_schema={
            "type": "object",
            "properties": {

                "origin_name": {
                    "type": "string",
                    "description": (
                        "Exact starting location provided by "
                        "the user."
                    ),
                },

                "destination_name": {
                    "type": "string",
                    "description": (
                        "Exact destination provided by "
                        "the user."
                    ),
                },

            },
            "required": [
                "origin_name",
                "destination_name",
            ],
        },
    ),

    types.FunctionDeclaration(
        name="get_traffic_delta",
        description=(
            "Get live traffic-adjusted driving duration and "
            "delay between two named places. Use this only "
            "after the main route has been established."
        ),
        parameters_json_schema={
            "type": "object",
            "properties": {

                "origin_name": {
                    "type": "string",
                },

                "destination_name": {
                    "type": "string",
                },

            },
            "required": [
                "origin_name",
                "destination_name",
            ],
        },
    ),

    types.FunctionDeclaration(
        name="search_pois",
        description=(
            "Find nearby points of interest around a coordinate. "
            "Each POI result includes a Google Maps URL. "
            "kind must be fuel, foods, accomodations, or toilets."
        ),
        parameters_json_schema={
            "type": "object",
            "properties": {

                "lat": {
                    "type": "number",
                },

                "lon": {
                    "type": "number",
                },

                "kind": {
                    "type": "string",
                    "enum": [
                        "fuel",
                        "foods",
                        "accomodations",
                        "toilets",
                    ],
                },

                "radius_m": {
                    "type": "integer",
                },

            },
            "required": [
                "lat",
                "lon",
                "kind",
            ],
        },
    ),
]


TOOLS = [
    types.Tool(
        function_declarations=FUNCTION_DECLARATIONS
    )
]


# =========================================================
# TOOL EXECUTION
# =========================================================

async def execute_tool(
    function_name: str,
    arguments: dict
):

    try:

        if function_name == "geocode_place":

            return await tool_geocode(
                arguments["place_name"]
            )

        if function_name == "get_route_summary":

            return await tool_get_route_summary(
                arguments["origin_name"],
                arguments["destination_name"],
            )

        if function_name == "get_traffic_delta":

            return await tool_get_traffic_delta(
                arguments["origin_name"],
                arguments["destination_name"],
            )

        if function_name == "search_pois":

            return await tool_search_pois(
                arguments["lat"],
                arguments["lon"],
                arguments["kind"],
                arguments.get(
                    "radius_m",
                    5000
                ),
            )

        return {
            "error":
                f"Unknown tool: {function_name}"
        }

    except Exception as error:

        return {
            "error":
                str(error)
        }


# =========================================================
# CONVERT HISTORY
# =========================================================

def convert_history(
    messages: list
):

    contents = []

    for message in messages:

        role = message.get(
            "role"
        )

        content = message.get(
            "content"
        )

        if role == "system":
            continue

        if role == "user" and content:

            contents.append(
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(
                            text=content
                        )
                    ],
                )
            )

        elif (
            role == "assistant"
            and content
        ):

            contents.append(
                types.Content(
                    role="model",
                    parts=[
                        types.Part.from_text(
                            text=content
                        )
                    ],
                )
            )

    return contents


# =========================================================
# MAIN CHAT LOOP
# =========================================================

async def run_chat_turn(
    messages: list
):

    contents = convert_history(
        messages
    )

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        tools=TOOLS,
        temperature=0.4,
    )

    max_iterations = 8

    final_text = ""

    route_summary_obtained = False

    route_origin = None
    route_destination = None

    for iteration in range(
        max_iterations
    ):

        response = (
            await client.aio.models.generate_content(
                model=MODEL,
                contents=contents,
                config=config,
            )
        )

        function_calls = (
            response.function_calls
        )

        # -------------------------------------------------
        # GEMINI HAS FINISHED
        # -------------------------------------------------

        if not function_calls:

            final_text = (
                response.text or ""
            )

            if final_text:

                contents.append(
                    types.Content(
                        role="model",
                        parts=[
                            types.Part.from_text(
                                text=final_text
                            )
                        ],
                    )
                )

            break

        # -------------------------------------------------
        # ADD GEMINI TOOL CALL
        # -------------------------------------------------

        contents.append(
            response.candidates[0].content
        )

        # -------------------------------------------------
        # EXECUTE TOOLS
        # -------------------------------------------------

        function_response_parts = []

        for function_call in function_calls:

            function_name = (
                function_call.name
            )

            arguments = dict(
                function_call.args or {}
            )

            print(
                f"Gemini tool call: "
                f"{function_name}({arguments})"
            )

            # ---------------------------------------------
            # PREVENT REPEATED ROUTE CALCULATIONS
            # ---------------------------------------------

            if function_name == "get_route_summary":

                requested_origin = (
                    arguments.get(
                        "origin_name",
                        ""
                    )
                    .strip()
                    .lower()
                )

                requested_destination = (
                    arguments.get(
                        "destination_name",
                        ""
                    )
                    .strip()
                    .lower()
                )

                if route_summary_obtained:

                    result = {
                        "error": (
                            "A successful route has already "
                            "been calculated for this trip. "
                            "Use the existing route result and "
                            "its break_options. Do not request "
                            "another route."
                        )
                    }

                    function_response_parts.append(
                        types.Part.from_function_response(
                            name=function_name,
                            response={
                                "result": result
                            },
                        )
                    )

                    continue

            # ---------------------------------------------
            # EXECUTE TOOL
            # ---------------------------------------------

            result = await execute_tool(
                function_name,
                arguments,
            )

            # ---------------------------------------------
            # RECORD SUCCESSFUL ROUTE
            # ---------------------------------------------

            if (
                function_name
                == "get_route_summary"
                and isinstance(result, dict)
                and not result.get("error")
                and result.get("distance_km") is not None
            ):

                route_summary_obtained = True

                route_origin = (
                    arguments.get(
                        "origin_name"
                    )
                )

                route_destination = (
                    arguments.get(
                        "destination_name"
                    )
                )

                print(
                    "Route summary obtained successfully. "
                    "Further route calculations are blocked "
                    "for this conversation turn."
                )

            function_response_parts.append(
                types.Part.from_function_response(
                    name=function_name,
                    response={
                        "result": result
                    },
                )
            )

        # -------------------------------------------------
        # SEND TOOL RESULTS BACK
        # -------------------------------------------------

        contents.append(
            types.Content(
                role="user",
                parts=function_response_parts,
            )
        )

    # =====================================================
    # FORCE FINAL RESPONSE
    # =====================================================

    if not final_text:

        print(
            "Gemini reached tool-call limit. "
            "Requesting final itinerary without tools."
        )

        final_config = (
            types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.4,
            )
        )

        final_response = (
            await client.aio.models.generate_content(
                model=MODEL,
                contents=contents,
                config=final_config,
            )
        )

        final_text = (
            final_response.text or ""
        )

        if final_text:

            contents.append(
                types.Content(
                    role="model",
                    parts=[
                        types.Part.from_text(
                            text=final_text
                        )
                    ],
                )
            )

    # =====================================================
    # SAVE FINAL RESPONSE
    # =====================================================

    updated_history = list(
        messages
    )

    if final_text:

        updated_history.append(
            {
                "role":
                    "assistant",

                "content":
                    final_text,
            }
        )

    else:

        updated_history.append(
            {
                "role":
                    "assistant",

                "content": (
                    "I couldn't complete "
                    "the route plan. "
                    "Please try the request again."
                ),
            }
        )

    return updated_history
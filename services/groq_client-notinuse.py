import os
import json
import httpx

from services.tools import (
    TOOLS,
    tool_geocode,
    tool_get_route_summary,
    tool_get_traffic_delta,
    tool_search_pois,
)


GROQ_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "openai/gpt-oss-20b"


SYSTEM_PROMPT = """You are Route Agent, a friendly India road-trip planning assistant.
Talk naturally, like a helpful travel-savvy friend, not a form.

Rules:
- If origin, destination, or group size/type is missing or vague (e.g. "my family", "a few friends"), ask a short clarifying question first. Never guess a number.
- Once you have origin, destination, and group info, use the available tools to get route distance/duration, traffic, and nearby points of interest.
- When suggesting stops, use the actual names returned by search_pois. Never invent stop names.
- For families or groups with children, prefer stops with food/toilets nearby and mention that plainly.
- For women traveling alone or in a women-only group, prioritize busier, well-known stops over isolated ones, and say so.
- IMPORTANT: You have no verified safety or family-friendliness ratings from any data source. Always frame these as general guidance ("generally considered...", "commonly a safer bet...") never as verified fact.
- After using the necessary tools, DO NOT return raw tool results such as coordinates or JSON.
- Always convert tool results into a natural-language response for the user.
- For a trip request with a specified number of days, organize the response by day.
- Include the available route distance, driving duration, traffic information, and suitable stops when the tools provide them.
- Only recommend actual POI names returned by search_pois.
- If a requested feature is not currently supported by the available tools, clearly say that it is not currently available instead of inventing information.
- Keep replies conversational and concise.
- Ask if the user wants anything changed, and make edits when asked, using the tools again as needed.
"""


TOOL_FUNCTIONS = {
    "geocode_place": lambda args: tool_geocode(
        args["place_name"]
    ),

    "get_route_summary": lambda args: tool_get_route_summary(
        args["origin_name"],
        args["destination_name"]
    ),

    "get_traffic_delta": lambda args: tool_get_traffic_delta(
        args["origin_name"],
        args["destination_name"]
    ),

    "search_pois": lambda args: tool_search_pois(
        args["lat"],
        args["lon"],
        args["kind"],
        args.get("radius_m", 5000)
    ),
}


async def _call_groq(messages: list) -> dict:

    headers = {
        "Authorization": f"Bearer {GROQ_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": MODEL,
        "messages": messages,
        "tools": TOOLS,
        "tool_choice": "auto",
        "temperature": 0.4,
    }

    async with httpx.AsyncClient(timeout=30) as client:

        resp = await client.post(
            GROQ_URL,
            headers=headers,
            json=payload
        )

        resp.raise_for_status()

        return resp.json()


async def run_chat_turn(messages: list) -> list:
    """
    messages:
        Conversation history without the system prompt.

    Returns:
        Updated conversation history including
        assistant and tool messages.
    """

    full_messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT
        }
    ] + messages


    # Allow the agent to perform multiple tool calls.
    for _ in range(5):

        data = await _call_groq(full_messages)

        msg = data["choices"][0]["message"]

        # Add assistant message to conversation.
        full_messages.append(msg)

        tool_calls = msg.get("tool_calls")


        # No tool call means the agent has produced
        # its final natural-language response.
        if not tool_calls:
            break


        # Execute all requested tools.
        for call in tool_calls:

            fn_name = call["function"]["name"]

            fn_args = json.loads(
                call["function"]["arguments"]
            )

            fn = TOOL_FUNCTIONS.get(fn_name)


            try:

                if fn:
                    result = await fn(fn_args)

                else:
                    result = {
                        "error": f"Unknown tool: {fn_name}"
                    }

            except Exception as e:

                result = {
                    "error": str(e)
                }


            # Send tool result back to the agent.
            full_messages.append({
                "role": "tool",
                "tool_call_id": call["id"],
                "content": json.dumps(result)
            })


    # Remove system prompt before storing history.
    return full_messages[1:]
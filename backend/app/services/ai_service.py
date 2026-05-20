import google.generativeai as genai
import os

from dotenv import load_dotenv
load_dotenv()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))




model = genai.GenerativeModel("gemini-2.5-flash")


def test_gemini():
    response = model.generate_content("Say hello from DAFT Junk.")

    return response.text

def enrich_article(title: str, summary: str) -> dict:
    prompt = f"""You are an intelligent news analyst for a calm, signal-focused news dashboard.

Given this article:
Title: {title}
Summary: {summary}

Return a JSON object with exactly these 3 fields:
- "brief": A clean 2-sentence summary of what happened. No fluff, no filler words.
- "why_it_matters": One sentence explaining the real-world significance.
- "impact": One sentence on who or what is most affected (industries, countries, people).

Respond with ONLY the JSON object. No markdown, no explanation."""

    response = model.generate_content(prompt)

    import json
    try:
        text = response.text.strip()
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        return json.loads(text.strip())
    except Exception:
        return {
            "brief": summary,
            "why_it_matters": "Could not generate analysis.",
            "impact": "Unknown."
        }
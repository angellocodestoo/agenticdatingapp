from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from typing import Optional

from pydantic import ValidationError

from .models import MatchReport, Persona


def _normalize_term(s: str) -> str:
    s = s.strip().lower()
    s = re.sub(r"\s+", " ", s)
    return s


def check_hard_red_flags(agent_a: Persona, agent_b: Persona) -> Optional[str]:
    """
    Programmatic check for immediate dealbreakers before LLM costs are incurred.

    We treat red flags as *terms* that should not appear in the other user's stated values/interests/bio.
    This is intentionally conservative and is expected to evolve into a richer rules engine.
    """

    b_haystack = " | ".join([*agent_b.core_values, *agent_b.interests, agent_b.bio_summary])
    a_haystack = " | ".join([*agent_a.core_values, *agent_a.interests, agent_a.bio_summary])

    b_haystack_n = _normalize_term(b_haystack)
    a_haystack_n = _normalize_term(a_haystack)

    for flag in agent_a.red_flags:
        f = _normalize_term(flag)
        if f and f in b_haystack_n:
            return f"Match rejected: Agent A's red flag '{flag}' was triggered."

    for flag in agent_b.red_flags:
        f = _normalize_term(flag)
        if f and f in a_haystack_n:
            return f"Match rejected: Agent B's red flag '{flag}' was triggered."

    return None


@dataclass(frozen=True)
class NegotiationConfig:
    model: str = "gpt-4o-mini"
    max_output_tokens: int = 800


def _mock_match_report(user_persona: Persona, match_persona: Persona) -> MatchReport:
    shared_interests = sorted(set(map(_normalize_term, user_persona.interests)).intersection(
        set(map(_normalize_term, match_persona.interests))
    ))
    suggested = user_persona.interests[0] if user_persona.interests else "Coffee"
    if shared_interests:
        # try to preserve original casing by picking from either list
        suggested = next(
            (i for i in user_persona.interests if _normalize_term(i) == shared_interests[0]),
            suggested,
        )

    score = 60 + min(30, 10 * len(shared_interests))
    score = max(1, min(100, score))
    return MatchReport(
        is_compatible=score >= 70,
        compatibility_score=score,
        summary_of_alignment=(
            "Mock negotiation (no API key). Shared interests suggest potential alignment."
        ),
        suggested_activity=f"{suggested} + a short walk",
        concerns_addressed=(
            "Mock mode: did not run multi-turn yellow-flag probing."
        ),
    )


def run_agent_negotiation(
    user_persona: Persona,
    match_persona: Persona,
    *,
    config: NegotiationConfig | None = None,
) -> MatchReport:
    """
    Simulates a conversation between two user agents to determine compatibility.

    - Fast-fails on programmatic hard red flags.
    - If `OPENAI_API_KEY` is present, calls an LLM and validates JSON into `MatchReport`.
    - Otherwise, returns a deterministic mock report so teams can develop without provider setup.
    """

    config = config or NegotiationConfig()

    red_flag_trigger = check_hard_red_flags(user_persona, match_persona)
    if red_flag_trigger:
        return MatchReport(
            is_compatible=False,
            compatibility_score=0,
            summary_of_alignment=red_flag_trigger,
            suggested_activity="None",
            concerns_addressed="Automated red-flag filter triggered immediately.",
        )

    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return _mock_match_report(user_persona, match_persona)

    # Lazy import so the package remains usable without the dependency installed in some environments.
    from openai import OpenAI  # type: ignore

    client = OpenAI(api_key=api_key)

    system_prompt = (
        "You are an expert AI Matchmaking Agent.\n"
        "Simulate a thoughtful, realistic conversation between two distinct user-agents to see if their "
        "values and lifestyles align.\n"
        "First, probe and resolve any yellow flags with specific questions.\n"
        "Then produce ONLY a JSON object matching the MatchReport schema."
    )

    user_prompt = f"""
Agent A:
- Bio: {user_persona.bio_summary}
- Values: {user_persona.core_values}
- Interests: {user_persona.interests}
- Yellow Flags to investigate: {user_persona.yellow_flags}

Agent B:
- Bio: {match_persona.bio_summary}
- Values: {match_persona.core_values}
- Interests: {match_persona.interests}
- Yellow Flags to investigate: {match_persona.yellow_flags}

Output requirements:
- Output ONLY valid JSON (no markdown, no commentary)
- JSON must match this schema keys:
  is_compatible, compatibility_score, summary_of_alignment, suggested_activity, concerns_addressed
"""

    # Prefer "strict JSON" prompting + Pydantic validation for portability across OpenAI client versions.
    resp = client.chat.completions.create(
        model=config.model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.4,
        max_tokens=config.max_output_tokens,
    )

    content = (resp.choices[0].message.content or "").strip()
    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"LLM did not return valid JSON. Content was:\n{content}") from e

    try:
        return MatchReport.model_validate(data)
    except ValidationError as e:
        raise RuntimeError(f"LLM JSON did not match MatchReport schema. JSON was:\n{content}") from e


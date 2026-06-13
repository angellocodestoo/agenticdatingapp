from __future__ import annotations

from typing import List

from pydantic import BaseModel, Field


class Persona(BaseModel):
    user_id: str
    bio_summary: str
    core_values: List[str]
    interests: List[str]
    red_flags: List[str] = Field(
        default_factory=list,
        description="Hard dealbreakers. Automatic disqualification.",
    )
    yellow_flags: List[str] = Field(
        default_factory=list,
        description="Nuanced concerns that the agent needs to probe.",
    )


class MatchReport(BaseModel):
    is_compatible: bool
    compatibility_score: int = Field(description="Score from 1 to 100", ge=0, le=100)
    summary_of_alignment: str = Field(description="Why the agents think this is a good or bad match.")
    suggested_activity: str = Field(description="Activity based on shared interests.")
    concerns_addressed: str = Field(
        description="How the agent investigated the yellow flags (or why it didn’t)."
    )


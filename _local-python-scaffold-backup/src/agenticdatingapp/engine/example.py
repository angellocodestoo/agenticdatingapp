from __future__ import annotations

from agenticdatingapp.engine.models import Persona
from agenticdatingapp.engine.negotiation import run_agent_negotiation


def main() -> None:
    vc_manager = Persona(
        user_id="user_123",
        bio_summary="High-powered VC manager, works 70 hours a week, values efficiency and curiosity.",
        core_values=["Continuous growth", "Ambition", "Family-oriented"],
        interests=["Skiing", "Tech History", "Fine Dining"],
        red_flags=["Smoking", "Lack of ambition"],
        yellow_flags=["Extremely limited free time"],
    )

    artist_entrepreneur = Persona(
        user_id="user_456",
        bio_summary="Runs a boutique design agency, flexible hours, values creativity and independence.",
        core_values=["Creativity", "Independence", "Ambition"],
        interests=["Contemporary Art", "Skiing", "Wine tasting"],
        red_flags=["Micromanagement"],
        yellow_flags=["Prefers spontaneous weekend trips"],
    )

    report = run_agent_negotiation(vc_manager, artist_entrepreneur)

    print("--- MATCH REPORT GENERATED ---")
    print(f"Compatible: {report.is_compatible}")
    print(f"Compatibility Score: {report.compatibility_score}/100")
    print(f"Summary: {report.summary_of_alignment}")
    print(f"Proposed Activity: {report.suggested_activity}")
    print(f"Yellow Flags Addressed: {report.concerns_addressed}")


if __name__ == "__main__":
    main()


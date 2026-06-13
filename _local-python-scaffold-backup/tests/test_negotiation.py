from agenticdatingapp.engine.models import Persona
from agenticdatingapp.engine.negotiation import check_hard_red_flags, run_agent_negotiation


def test_red_flag_fast_fail() -> None:
    a = Persona(
        user_id="a",
        bio_summary="",
        core_values=["Ambition"],
        interests=[],
        red_flags=["smoking"],
        yellow_flags=[],
    )
    b = Persona(
        user_id="b",
        bio_summary="I smoke occasionally.",
        core_values=[],
        interests=[],
        red_flags=[],
        yellow_flags=[],
    )

    msg = check_hard_red_flags(a, b)
    assert msg is not None
    assert "red flag" in msg.lower()


def test_run_returns_report_without_api_key(monkeypatch) -> None:
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    a = Persona(user_id="a", bio_summary="", core_values=["Kindness"], interests=["Skiing"])
    b = Persona(user_id="b", bio_summary="", core_values=["Curiosity"], interests=["Skiing"])

    report = run_agent_negotiation(a, b)
    assert report.compatibility_score >= 0
    assert report.suggested_activity


"""Private happy-mode unlock endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.models import (
    HappyChallengeRequest,
    HappyChallengeResponse,
    HappyVerifyRequest,
    HappyVerifyResponse,
)
from app.services import happy_auth

router = APIRouter()


@router.post("/happy/challenge", response_model=HappyChallengeResponse)
async def get_happy_challenge(request: HappyChallengeRequest) -> HappyChallengeResponse:
    question = happy_auth.challenge_for_code(request.code)
    if not question:
        return HappyChallengeResponse(ok=False, message="wrong answer")
    return HappyChallengeResponse(ok=True, question=question)


@router.post("/happy/verify", response_model=HappyVerifyResponse)
async def verify_happy_mode(request: HappyVerifyRequest) -> HappyVerifyResponse:
    token = happy_auth.verify_answer(request.code, request.answer, request.session_id)
    if not token:
        return HappyVerifyResponse(ok=False, message="wrong answer")
    return HappyVerifyResponse(ok=True, token=token)

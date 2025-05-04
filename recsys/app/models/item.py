from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from enum import Enum


class ItemType(str, Enum):
    MOVIE = "MOVIE"
    TRACK = "TRACK"
    BOOK = "BOOK"
    GAME = "GAME"
    ART = "ART"


class Provider(str, Enum):
    SPOTIFY = "SPOTIFY"
    TMDB = "TMDB"


class Item(BaseModel):
    id: str
    title: str
    type: ItemType
    provider: Provider
    external_id: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
    user_id: str


class RecommendationScore(BaseModel):
    item_id: str
    score: float


class RecommendationResponse(BaseModel):
    recommendations: List[RecommendationScore]
    user_id: str
    limit: int

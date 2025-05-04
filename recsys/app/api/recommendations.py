from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

from ..models.item import Item, RecommendationResponse
from ..models.similarity import SimilarityEngine

router = APIRouter()

items_db: Dict[str, Item] = {}
similarity_engine = SimilarityEngine()

@router.post("/items/", response_model=Item)
async def create_item(item: Item):
    """Add an item to the recommendation system."""
    items_db[item.id] = item
    similarity_engine.fit(list(items_db.values()))
    return item

@router.get("/items/", response_model=List[Item])
async def get_items(user_id: Optional[str] = None):
    """Get all items, optionally filtered by user_id."""
    if user_id:
        return [item for item in items_db.values() if item.user_id == user_id]
    return list(items_db.values())

@router.get("/recommendations", response_model=RecommendationResponse)
async def get_recommendations(
    user_id: str = Query(..., description="User ID to get recommendations for"),
    limit: int = Query(10, description="Maximum number of recommendations to return"),
    item_ids: Optional[List[str]] = Query(None, description="Optional list of item IDs to base recommendations on")
):
    """
    Get recommendations for a user based on content similarity.
    
    If item_ids is provided, recommendations will be based on those specific items.
    Otherwise, all items associated with the user will be used.
    """
    if not item_ids:
        user_items = [item for item in items_db.values() if item.user_id == user_id]
        if not user_items:
            raise HTTPException(status_code=404, detail=f"No items found for user {user_id}")
        item_ids = [item.id for item in user_items]
    
    recommendations = similarity_engine.get_recommendations(user_id, item_ids, limit)
    
    return RecommendationResponse(
        recommendations=recommendations,
        user_id=user_id,
        limit=limit
    )

@router.post("/reset")
async def reset_data():
    """Reset all data (for testing purposes)."""
    items_db.clear()
    similarity_engine.fit([])
    return {"status": "success", "message": "All data has been reset"}

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models.item import Item, ItemType, Provider

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_data():
    """Reset data before each test."""
    client.post("/api/reset")
    yield
    client.post("/api/reset")

@pytest.fixture
def sample_items():
    """Create and add sample items for testing."""
    items = [
        Item(
            id="1",
            title="Inception",
            type=ItemType.MOVIE,
            provider=Provider.TMDB,
            external_id="27205",
            user_id="user1",
            metadata={
                "genres": ["Science Fiction", "Action", "Adventure"],
                "overview": "A thief who steals corporate secrets through dream-sharing technology.",
            },
        ),
        Item(
            id="2",
            title="The Dark Knight",
            type=ItemType.MOVIE,
            provider=Provider.TMDB,
            external_id="155",
            user_id="user1",
            metadata={
                "genres": ["Action", "Crime", "Drama", "Thriller"],
                "overview": "Batman fights against the Joker in Gotham City.",
            },
        ),
        Item(
            id="3",
            title="Bohemian Rhapsody",
            type=ItemType.TRACK,
            provider=Provider.SPOTIFY,
            external_id="3z8h0TU7ReDPLIbEnYhWZb",
            user_id="user2",
            metadata={
                "artists": ["Queen"],
                "album": "A Night at the Opera",
                "genres": ["Rock", "Classic Rock"],
            },
        ),
    ]
    
    for item in items:
        client.post("/api/items/", json=item.dict())
    
    return items


class TestRecommendationsAPI:
    def test_health_check(self):
        """Test the health check endpoint."""
        response = client.get("/")
        assert response.status_code == 200
        assert response.json() == {"status": "ok", "service": "inspira-recsys"}
        
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}
    
    def test_create_item(self):
        """Test creating an item."""
        item = Item(
            id="test1",
            title="Test Item",
            type=ItemType.MOVIE,
            provider=Provider.TMDB,
            external_id="12345",
            user_id="user1",
            metadata={"genres": ["Test"]},
        )
        
        response = client.post("/api/items/", json=item.dict())
        assert response.status_code == 200
        assert response.json()["id"] == "test1"
        assert response.json()["title"] == "Test Item"
    
    def test_get_items(self):
        """Test getting all items."""
        sample_items = [
            Item(
                id="test1",
                title="Test Item 1",
                type=ItemType.MOVIE,
                provider=Provider.TMDB,
                external_id="12345",
                user_id="user1",
                metadata={},
            ),
            Item(
                id="test2",
                title="Test Item 2",
                type=ItemType.TRACK,
                provider=Provider.SPOTIFY,
                external_id="67890",
                user_id="user2",
                metadata={},
            ),
        ]
        
        for item in sample_items:
            client.post("/api/items/", json=item.dict())
        
        response = client.get("/api/items/")
        assert response.status_code == 200
        assert len(response.json()) == 2
        
        response = client.get("/api/items/?user_id=user1")
        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["id"] == "test1"
        
        response = client.get("/api/items/?user_id=user2")
        assert response.status_code == 200
        assert len(response.json()) == 1
        assert response.json()[0]["id"] == "test2"
    
    def test_get_recommendations(self, sample_items):
        """Test getting recommendations."""
        response = client.get("/api/recommendations?user_id=user1&limit=5")
        assert response.status_code == 200
        assert "recommendations" in response.json()
        assert response.json()["user_id"] == "user1"
        assert response.json()["limit"] == 5
        
        recommendations = response.json()["recommendations"]
        assert len(recommendations) == 1  # Only one item not owned by user1
        assert recommendations[0]["item_id"] == "3"
        
        response = client.get("/api/recommendations?user_id=user1&limit=5&item_ids=1")
        assert response.status_code == 200
        recommendations = response.json()["recommendations"]
        assert len(recommendations) == 2  # Items 2 and 3
        
        response = client.get("/api/recommendations?user_id=nonexistent&limit=5")
        assert response.status_code == 404
    
    def test_reset_data(self, sample_items):
        """Test resetting data."""
        response = client.get("/api/items/")
        assert response.status_code == 200
        assert len(response.json()) == 3
        
        response = client.post("/api/reset")
        assert response.status_code == 200
        assert response.json()["status"] == "success"
        
        response = client.get("/api/items/")
        assert response.status_code == 200
        assert len(response.json()) == 0

import pytest
import numpy as np
from app.models.item import Item, ItemType, Provider, RecommendationScore
from app.models.similarity import SimilarityEngine


@pytest.fixture
def sample_items():
    """Create a set of sample items for testing."""
    return [
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
            title="The Shawshank Redemption",
            type=ItemType.MOVIE,
            provider=Provider.TMDB,
            external_id="278",
            user_id="user1",
            metadata={
                "genres": ["Drama", "Crime"],
                "overview": "Two imprisoned men bond over a number of years.",
            },
        ),
        Item(
            id="3",
            title="Bohemian Rhapsody",
            type=ItemType.TRACK,
            provider=Provider.SPOTIFY,
            external_id="3z8h0TU7ReDPLIbEnYhWZb",
            user_id="user1",
            metadata={
                "artists": ["Queen"],
                "album": "A Night at the Opera",
                "genres": ["Rock", "Classic Rock"],
            },
        ),
        Item(
            id="4",
            title="The Dark Knight",
            type=ItemType.MOVIE,
            provider=Provider.TMDB,
            external_id="155",
            user_id="user2",
            metadata={
                "genres": ["Action", "Crime", "Drama", "Thriller"],
                "overview": "Batman fights against the Joker in Gotham City.",
            },
        ),
        Item(
            id="5",
            title="Bohemian Rhapsody Movie",
            type=ItemType.MOVIE,
            provider=Provider.TMDB,
            external_id="424694",
            user_id="user2",
            metadata={
                "genres": ["Drama", "Music"],
                "overview": "The story of the legendary rock band Queen and lead singer Freddie Mercury.",
            },
        ),
    ]


class TestSimilarityEngine:
    def test_extract_features(self, sample_items):
        """Test feature extraction from items."""
        engine = SimilarityEngine()
        
        movie_features = engine.extract_features(sample_items[0])
        assert "Inception" in movie_features
        assert "MOVIE" in movie_features
        assert "Science Fiction" in movie_features
        assert "Action" in movie_features
        assert "Adventure" in movie_features
        assert "A thief who steals corporate secrets" in movie_features
        
        music_features = engine.extract_features(sample_items[2])
        assert "Bohemian Rhapsody" in music_features
        assert "TRACK" in music_features
        assert "Queen" in music_features
        assert "A Night at the Opera" in music_features
        assert "Rock" in music_features
        assert "Classic Rock" in music_features
    
    def test_fit(self, sample_items):
        """Test fitting the TF-IDF vectorizer on items."""
        engine = SimilarityEngine()
        engine.fit(sample_items)
        
        assert len(engine.items_by_id) == 5
        assert engine.items_by_id["1"].title == "Inception"
        
        assert len(engine.item_features) == 5
        assert all(item_id in engine.item_features for item_id in ["1", "2", "3", "4", "5"])
        
        assert engine.tfidf_matrix is not None
        assert engine.tfidf_matrix.shape[0] == 5  # 5 items
    
    def test_get_recommendations(self, sample_items):
        """Test getting recommendations based on content similarity."""
        engine = SimilarityEngine()
        engine.fit(sample_items)
        
        recs = engine.get_recommendations("user1", ["1"], limit=3)
        
        assert len(recs) > 0
        assert all(isinstance(rec, RecommendationScore) for rec in recs)
        
        assert all(0 <= rec.score <= 1 for rec in recs)
        
        assert all(rec.item_id != "1" for rec in recs)
        
        dark_knight_rec = next((rec for rec in recs if rec.item_id == "4"), None)
        assert dark_knight_rec is not None
    
    def test_get_recommendations_with_multiple_items(self, sample_items):
        """Test getting recommendations based on multiple items."""
        engine = SimilarityEngine()
        engine.fit(sample_items)
        
        recs = engine.get_recommendations("user1", ["1", "3"], limit=3)
        
        assert len(recs) > 0
        
        assert all(rec.item_id not in ["1", "3"] for rec in recs)
        
        bohemian_movie_rec = next((rec for rec in recs if rec.item_id == "5"), None)
        assert bohemian_movie_rec is not None
    
    def test_empty_recommendations(self):
        """Test getting recommendations with no items."""
        engine = SimilarityEngine()
        
        recs = engine.get_recommendations("user1", ["1"], limit=3)
        assert len(recs) == 0
        
        engine.fit([])
        recs = engine.get_recommendations("user1", ["1"], limit=3)
        assert len(recs) == 0
        
        engine.fit([Item(
            id="1",
            title="Test",
            type=ItemType.MOVIE,
            provider=Provider.TMDB,
            external_id="123",
            user_id="user1",
            metadata={},
        )])
        recs = engine.get_recommendations("user1", ["999"], limit=3)
        assert len(recs) == 0

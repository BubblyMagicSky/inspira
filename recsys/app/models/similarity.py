from typing import Dict, List, Optional

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from .item import Item, ItemType, RecommendationScore


class SimilarityEngine:
    """Content-based recommendation engine using TF-IDF and cosine similarity."""
    
    def __init__(self):
        self.vectorizer = TfidfVectorizer(
            analyzer='word',
            ngram_range=(1, 2),
            min_df=0.0,
            stop_words='english'
        )
        self.items_by_id: Dict[str, Item] = {}
        self.item_features: Dict[str, str] = {}
        self.tfidf_matrix = None
        
    def extract_features(self, item: Item) -> str:
        """Extract features from an item for TF-IDF processing."""
        features = []
        
        features.append(item.title)
        
        features.append(item.type.value)
        
        if item.metadata:
            genres = item.metadata.get('genres', [])
            if isinstance(genres, list):
                features.extend(genres)
                
            if item.type == ItemType.MOVIE:
                if 'overview' in item.metadata:
                    features.append(item.metadata['overview'])
                    
            elif item.type == ItemType.TRACK:
                if 'artists' in item.metadata and isinstance(item.metadata['artists'], list):
                    features.extend(item.metadata['artists'])
                if 'album' in item.metadata:
                    features.append(item.metadata['album'])
                    
            elif item.type == ItemType.BOOK:
                if 'author' in item.metadata:
                    features.append(item.metadata['author'])
                if 'description' in item.metadata:
                    features.append(item.metadata['description'])
                    
            elif item.type == ItemType.GAME:
                if 'developer' in item.metadata:
                    features.append(item.metadata['developer'])
                if 'platforms' in item.metadata and isinstance(item.metadata['platforms'], list):
                    features.extend(item.metadata['platforms'])
                    
            elif item.type == ItemType.ART:
                if 'artist' in item.metadata:
                    features.append(item.metadata['artist'])
                if 'medium' in item.metadata:
                    features.append(item.metadata['medium'])
        
        return ' '.join(str(feature) for feature in features if feature)
    
    def fit(self, items: List[Item]):
        """Fit the TF-IDF vectorizer on the provided items."""
        self.items_by_id = {item.id: item for item in items}
        
        self.item_features = {
            item.id: self.extract_features(item) 
            for item in items
        }
        
        if self.item_features:
            feature_texts = list(self.item_features.values())
            self.tfidf_matrix = self.vectorizer.fit_transform(feature_texts)
        else:
            self.tfidf_matrix = None
    
    def get_recommendations(
        self, 
        user_id: str, 
        item_ids: Optional[List[str]] = None, 
        limit: int = 10
    ) -> List[RecommendationScore]:
        """
        Get recommendations for a user based on content similarity.
        
        Args:
            user_id: The ID of the user to get recommendations for
            item_ids: Optional list of item IDs to use as the basis for recommendations
            limit: Maximum number of recommendations to return
            
        Returns:
            List of RecommendationScore objects with item_id and score
        """
        if not self.tfidf_matrix or not self.items_by_id:
            return []
        
        if not item_ids:
            item_ids = list(self.items_by_id.keys())
        
        valid_item_ids = [item_id for item_id in item_ids if item_id in self.items_by_id]
        
        if not valid_item_ids:
            return []
        
        item_indices = [list(self.item_features.keys()).index(item_id) for item_id in valid_item_ids]
        
        user_vector = self.tfidf_matrix[item_indices].mean(axis=0)
        
        similarity_scores = cosine_similarity(user_vector, self.tfidf_matrix).flatten()
        
        item_scores = list(zip(list(self.item_features.keys()), similarity_scores))
        
        item_scores.sort(key=lambda x: x[1], reverse=True)
        
        item_scores = [(item_id, score) for item_id, score in item_scores if item_id not in valid_item_ids]
        
        return [
            RecommendationScore(item_id=item_id, score=float(score))
            for item_id, score in item_scores[:limit]
        ]

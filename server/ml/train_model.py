import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
import pickle
import os

def generate_synthetic_data(n_samples=5000):
    np.random.seed(42)
    
    # Features
    hour = np.random.randint(0, 24, n_samples)
    day_of_week = np.random.randint(0, 7, n_samples)
    incident_density = np.random.randint(0, 100, n_samples)
    has_event = np.random.choice([0, 1], n_samples, p=[0.9, 0.1])
    is_raining = np.random.choice([0, 1], n_samples, p=[0.85, 0.15])
    
    # Base risk is somewhat correlated with baseline incident density
    risk = incident_density * 0.6
    
    # Time of day factors
    # Night time (22 to 4) is riskier
    night_mask = (hour >= 22) | (hour <= 4)
    risk[night_mask] += 25
    
    # Evening (18 to 21) is slightly riskier
    evening_mask = (hour >= 18) & (hour <= 21)
    risk[evening_mask] += 10
    
    # Weekends might have slightly higher risk late night
    weekend_night_mask = night_mask & (day_of_week >= 5)
    risk[weekend_night_mask] += 10
    
    # Events increase risk (crowd surge, pickpocketing, etc.)
    risk += has_event * 15
    
    # Rain increases risk (isolated stretches, poor visibility, fewer bystanders)
    risk += is_raining * 12
    
    # Add noise
    noise = np.random.normal(0, 5, n_samples)
    risk += noise
    
    # Clip to 0-100
    risk = np.clip(risk, 0, 100)
    
    df = pd.DataFrame({
        'hour': hour,
        'day_of_week': day_of_week,
        'incident_density': incident_density,
        'has_event': has_event,
        'is_raining': is_raining,
        'risk_index': risk
    })
    
    return df

def train_and_save_model():
    print("Generating synthetic historical data for NCRB incidents and conditions...")
    df = generate_synthetic_data()
    
    X = df[['hour', 'day_of_week', 'incident_density', 'has_event', 'is_raining']]
    y = df['risk_index']
    
    print("Training Gradient Boosted Tree model...")
    model = GradientBoostingRegressor(n_estimators=100, learning_rate=0.1, max_depth=4, random_state=42)
    model.fit(X, y)
    
    # Ensure ml directory exists
    os.makedirs(os.path.dirname(os.path.abspath(__file__)), exist_ok=True)
    
    model_path = os.path.join(os.path.dirname(__file__), 'risk_model.pkl')
    with open(model_path, 'wb') as f:
        pickle.dump(model, f)
        
    print(f"✅ Model trained successfully! Saved to {model_path}")
    print(f"R^2 Score on training data: {model.score(X, y):.4f}")

if __name__ == "__main__":
    train_and_save_model()

# ClearEdge Deals - Socioeconomic Data API Setup

## Overview

ClearEdge Deals now integrates real socioeconomic data to enhance property analysis. The system uses multiple free APIs to provide authentic demographic information, walkability scores, and crime data for comprehensive neighborhood analysis.

## Required API Keys (Optional but Recommended)

### 1. US Census Bureau API (FREE)
- **Purpose**: Demographics, income, education data
- **Cost**: Free
- **Signup**: https://api.census.gov/data/key_signup.html
- **Environment Variable**: `CENSUS_API_KEY`
- **Note**: Free tier allows 500 requests per day. No API key required for basic usage.

### 2. Walk Score API (FREEMIUM)
- **Purpose**: Walkability, transit, and bike scores
- **Cost**: Free tier with 5,000 requests/month
- **Signup**: https://www.walkscore.com/professional/walk-score-apis.php
- **Environment Variable**: `WALKSCORE_API_KEY`
- **Required for**: Walk Score, Transit Score, Bike Score

### 3. CrimeoMeter API (OPTIONAL)
- **Purpose**: Crime incident data and safety scores
- **Cost**: Freemium model
- **Signup**: https://www.crimeometer.com/crime-data-api
- **Environment Variable**: `CRIMEOMETER_API_KEY`
- **Note**: System provides fallback crime estimates if not available

## Setup Instructions

### 1. Add Environment Variables

Add these to your `.env` file or Replit Secrets:

```bash
# Optional API keys for enhanced data
WALKSCORE_API_KEY=your_walkscore_api_key_here
CRIMEOMETER_API_KEY=your_crimeometer_api_key_here
CENSUS_API_KEY=your_census_api_key_here
```

### 2. Data Sources Used

**Always Available (No API Key Required)**:
- US Census Bureau geocoding
- Basic demographic data from Census Bureau
- Fallback crime safety scores

**Enhanced with API Keys**:
- Walk Score, Transit Score, Bike Score
- Real-time crime incident data
- Enhanced demographic analytics

### 3. Data Integration

The system automatically:
1. Geocodes property addresses using US Census Bureau
2. Fetches demographic data (income, education, unemployment)
3. Gets walkability scores (if API key provided)
4. Retrieves crime data and safety index
5. Integrates all data into AI property analysis

## API Endpoints

### Get Property Demographics
```
GET /api/properties/:id/demographics
```

Returns comprehensive socioeconomic data for a property:

```json
{
  "location": {
    "lat": 34.0522,
    "lng": -118.2437,
    "zipCode": "90210"
  },
  "demographics": {
    "medianIncome": 85000,
    "educationLevel": "45.2% Bachelor's+",
    "ageMedian": 34.5,
    "householdSize": 2.8,
    "unemploymentRate": 4.2,
    "homeOwnershipRate": 68.5
  },
  "walkability": {
    "walkScore": 78,
    "transitScore": 65,
    "bikeScore": 82,
    "description": "Very Walkable"
  },
  "crime": {
    "crimeScore": "B",
    "safetyIndex": 78
  }
}
```

## AI Analysis Enhancement

With socioeconomic data, the AI analysis now includes:

- **Real neighborhood demographics** (median income, education levels)
- **Walkability assessment** (Walk Score, transit accessibility)
- **Safety analysis** (crime grades, safety index)
- **Market context** (unemployment rates, home ownership)
- **Investment insights** based on demographic trends

## Fallback Behavior

If API keys are not provided:
- Census data still works (no key required for basic usage)
- Walkability shows as "N/A" with recommendation to add API key
- Crime data provides estimated safety scores
- AI analysis continues with available data

## Cost Optimization

All APIs used have generous free tiers:
- **US Census**: Free unlimited for basic data
- **Walk Score**: 5,000 requests/month free
- **CrimeoMeter**: Freemium with basic free tier

For typical usage, the free tiers should be sufficient for most ClearEdge Deals installations.

## Error Handling

The system gracefully handles:
- Missing API keys (uses fallback data)
- API rate limits (caches responses)
- Network timeouts (provides estimated values)
- Invalid addresses (geocoding fallbacks)

This ensures the platform always provides analysis, with enhanced accuracy when API keys are available.
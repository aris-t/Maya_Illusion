// Service to handle communication with backend for AI polygon data

// Base URL for the API
const API_BASE_URL = 'http://localhost:5000/api'; // Change this to your actual backend URL

// Function to fetch polygon data from the backend
export const fetchPolygonData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/polygons`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching polygon data:', error);
    return [];
  }
};

// Function to fetch specific polygon data by ID or category
export const fetchPolygonsByCategory = async (category) => {
  try {
    const response = await fetch(`${API_BASE_URL}/polygons/category/${category}`);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error fetching ${category} polygons:`, error);
    return [];
  }
};

// Function to post feedback about a polygon (correct/incorrect identification)
export const submitPolygonFeedback = async (polygonId, feedback) => {
  try {
    const response = await fetch(`${API_BASE_URL}/polygons/${polygonId}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(feedback),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error submitting polygon feedback:', error);
    throw error;
  }
};

// Mock function to generate sample polygon data for testing
export const getMockPolygonData = () => {
  return [
    {
      id: '1',
      label: 'Face',
      confidence: 0.92,
      color: '#00FF88', // Green for faces
      points: [
        { x: 120, y: 80 },
        { x: 180, y: 80 },
        { x: 180, y: 150 },
        { x: 120, y: 150 }
      ],
      metadata: {
        age: '25-35',
        emotion: 'Neutral'
      }
    },
    {
      id: '2',
      label: 'Hand',
      confidence: 0.68,
      color: '#4488FF', // Blue for hands
      points: [
        { x: 320, y: 220 },
        { x: 350, y: 220 },
        { x: 360, y: 260 },
        { x: 330, y: 270 }
      ],
      metadata: {
        gesture: 'Open',
        side: 'Right'
      }
    },
    {
      id: '3',
      label: 'Object',
      confidence: 0.45,
      color: '#FF5500', // Orange for objects
      points: [
        { x: 500, y: 300 },
        { x: 580, y: 310 },
        { x: 570, y: 380 },
        { x: 490, y: 370 }
      ],
      metadata: {
        type: 'Unknown',
      }
    },
    {
      id: '4',
      label: 'Face',
      confidence: 0.88,
      color: '#00FF88', // Green for faces
      points: [
        { x: 700, y: 150 },
        { x: 750, y: 150 },
        { x: 760, y: 200 },
        { x: 740, y: 230 },
        { x: 710, y: 230 },
        { x: 690, y: 200 }
      ],
      metadata: {
        age: '40-50',
        emotion: 'Concern'
      }
    },
    {
      id: '5',
      label: 'Object',
      confidence: 0.75,
      color: '#FF5500', // Orange for objects
      points: [
        { x: 400, y: 400 },
        { x: 450, y: 380 },
        { x: 480, y: 420 },
        { x: 460, y: 480 },
        { x: 410, y: 470 }
      ],
      metadata: {
        type: 'Device'
      }
    }
  ];
};
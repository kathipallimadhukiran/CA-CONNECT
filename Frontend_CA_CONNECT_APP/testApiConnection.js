import { API_BASE_URL } from './config';

const testApiConnection = async () => {
  try {
    console.log('Testing API connection to:', API_BASE_URL);
    
    // Test health check
    const healthResponse = await fetch(`${API_BASE_URL.replace('/api', '')}/health`);
    const healthData = await healthResponse.json();
    console.log('Health check:', healthData);
    
    // Test authentication (if needed)
    console.log('API connection test completed successfully!');
  } catch (error) {
    console.error('API connection test failed:', error);
  }
};

testApiConnection();

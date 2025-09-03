import axios from 'axios';
import { API_BASE_URL } from '../config';

const API_URL = `${API_BASE_URL}/filings`;

// Get all filings for a client
export const getClientFilings = async (clientId) => {
  try {
    const response = await axios.get(`${API_URL}/client/${clientId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching filings:', error);
    throw error.response?.data?.message || 'Failed to fetch filings';
  }
};

// Create or update a filing
export const saveFiling = async (filingData, token) => {
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token,
      },
    };
    
    const response = await axios.post(API_URL, filingData, config);
    return response.data;
  } catch (error) {
    console.error('Error saving filing:', error);
    throw error.response?.data?.message || 'Failed to save filing';
  }
};

// Mark a filing as filed
export const markFilingAsFiled = async (filingId, notes = '', token) => {
  try {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'x-auth-token': token,
      },
    };
    
    const response = await axios.put(
      `${API_URL}/${filingId}/filed`,
      { notes },
      config
    );
    
    return response.data;
  } catch (error) {
    console.error('Error marking filing as filed:', error);
    throw error.response?.data?.message || 'Failed to update filing status';
  }
};

// Delete a filing
export const deleteFiling = async (filingId, token) => {
  try {
    const config = {
      headers: {
        'x-auth-token': token,
      },
    };
    
    await axios.delete(`${API_URL}/${filingId}`, config);
  } catch (error) {
    console.error('Error deleting filing:', error);
    throw error.response?.data?.message || 'Failed to delete filing';
  }
};

// Generate monthly filings for a client
export const generateMonthlyFilings = async (clientId, year, month, token) => {
  try {
    const config = {
      headers: {
        'x-auth-token': token,
      },
    };
    
    const response = await axios.post(
      `${API_URL}/generate/${clientId}`,
      { year, month },
      config
    );
    
    return response.data;
  } catch (error) {
    console.error('Error generating monthly filings:', error);
    throw error.response?.data?.message || 'Failed to generate monthly filings';
  }
};

export default {
  getClientFilings,
  saveFiling,
  markFilingAsFiled,
  deleteFiling,
  generateMonthlyFilings,
};

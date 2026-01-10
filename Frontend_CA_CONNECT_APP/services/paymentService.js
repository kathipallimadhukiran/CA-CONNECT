import api from '../utils/api';
import { API_BASE_URL } from '../config';

const createOutstandingPayment = async (clientId, amount, description) => {
  try {
    const res = await api.post('/payments/outstanding', { clientId, amount, description });
    return res.data;
  } catch (error) {
    console.error('Error creating outstanding payment:', error.message);
    throw error;
  }
};

const getPaymentHistory = async (clientId, limit = 10, page = 1) => {
  try {
    const endpoint = `/payments/client/${clientId}/history?limit=${limit}&page=${page}`;
    const res = await api.get(endpoint);
    return res.data;
  } catch (error) {
    console.error('Error fetching payment history:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    throw error;
  }
};

const markPaymentAsPaid = async (paymentId, transactionId, notes) => {
  try {
    const res = await api.put(`/payments/${paymentId}/mark-paid`, { transactionId, notes });
    return res.data;
  } catch (error) {
    console.error('Error marking payment as paid:', error.message);
    throw error;
  }
};

const recordManualPayment = async (paymentData) => {
  try {
    // Validate required fields
    if (!paymentData.clientId || !paymentData.amount || !paymentData.paymentMethod || !paymentData.paidAt) {
      throw new Error('Missing required payment information');
    }

    const res = await api.post('/payments/manual', paymentData);
    return res.data;
  } catch (error) {
    console.error('Error recording manual payment:', error);
    throw error;
  }
};

export default {
  createOutstandingPayment,
  getPaymentHistory,
  markPaymentAsPaid,
  recordManualPayment,
};

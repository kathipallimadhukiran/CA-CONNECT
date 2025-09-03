import api from '../utils/api';

const createOutstandingPayment = async (clientId, amount, description) => {
  try {
    const res = await api.post('/payment/outstanding', { clientId, amount, description });
    return res.data;
  } catch (error) {
    console.error('Error creating outstanding payment:', error.message);
    throw error;
  }
};

const getPaymentHistory = async (clientId, limit = 10, page = 1) => {
  try {
    const res = await api.get(`/payment/client/${clientId}/history?limit=${limit}&page=${page}`);
    return res.data;
  } catch (error) {
    console.error('Error fetching payment history:', error.message);
    throw error;
  }
};

const markPaymentAsPaid = async (paymentId, transactionId, notes) => {
  try {
    const res = await api.put(`/payment/${paymentId}/mark-paid`, { transactionId, notes });
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

    const res = await api.post('/payment/manual', paymentData);
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

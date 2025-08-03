import { authService } from './auth';

const API_BASE_URL = 'http://localhost:3000/api';

// Helper function to get authenticated headers
const getAuthHeaders = async () => {
  const token = await authService.getAccessToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const clientService = {
  async getClients(page = 1, limit = 20, search = '') {
    try {
      // First, update the client data in services/client.js to include GST types
      const dummyClients = [
        {
          id: '1',
          name: 'ABC Company Ltd.',
          email: 'abc@company.com',
          phoneNumber: '9876543210',
          address: 'Mumbai, Maharashtra',
          gstNumber: '27ABCDE1234F1Z5',
          gstType: 'regular', // regular, composite, or iff
          businessType: 'Partnership',
          totalOutstanding: 25000,
          totalPaid: 650000,
          status: 'active',
          pendingFiles: 3
        },
        {
          id: '2',
          name: 'XYZ Traders',
          email: 'xyz@traders.com',
          phoneNumber: '9876543211',
          address: 'Delhi, NCR',
          gstNumber: '07XYZTR5678G2H6',
          gstType: 'composite', // composite GST
          businessType: 'Partnership',
          totalOutstanding: 15000,
          totalPaid: 45000,
          status: 'active',
          pendingFiles: 0
        },
        {
          id: '3',
          name: 'PQR Solutions',
          email: 'pqr@solutions.com',
          phoneNumber: '9876543212',
          address: 'Bangalore, Karnataka',
          gstNumber: '29PQRSL9012I3J7',
          gstType: 'iff', // IFF (Input Tax Credit)
          businessType: 'Partnership',
          totalOutstanding: 35000,
          totalPaid: 25000,
          status: 'active',
          pendingFiles: 5
        },
        {
          id: '4',
          name: 'LMN Enterprises',
          email: 'lmn@enterprises.com',
          phoneNumber: '9876543213',
          address: 'Chennai, Tamil Nadu',
          gstNumber: '33LMNEN3456K4L8',
          gstType: 'regular', // regular GST
          businessType: 'Partnership',
          totalOutstanding: 18000,
          totalPaid: 60000,
          status: 'active',
          pendingFiles: 2
        },
        {
          id: '5',
          name: 'Composite Traders',
          email: 'composite@traders.com',
          phoneNumber: '9876543214',
          address: 'Pune, Maharashtra',
          gstNumber: '27COMP1234F1Z5',
          gstType: 'composite', // composite GST
          businessType: 'Partnership',
          totalOutstanding: 12000,
          totalPaid: 30000,
          status: 'active',
          pendingFiles: 1
        },
        {
          id: '6',
          name: 'IFF Solutions',
          email: 'iff@solutions.com',
          phoneNumber: '9876543215',
          address: 'Hyderabad, Telangana',
          gstNumber: '36IFF1234F1Z5',
          gstType: 'iff', // IFF (Input Tax Credit)
          businessType: 'Partnership',
          totalOutstanding: 45000,
          totalPaid: 80000,
          status: 'active',
          pendingFiles: 4
        }
      ];

      // Filter by search if provided
      let filteredClients = dummyClients;
      if (search) {
        filteredClients = dummyClients.filter(client => 
          client.name.toLowerCase().includes(search.toLowerCase()) ||
          client.email.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Simulate pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedClients = filteredClients.slice(startIndex, endIndex);

      return {
        clients: paginatedClients,
        total: filteredClients.length,
        page,
        limit,
        totalPages: Math.ceil(filteredClients.length / limit)
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch clients');
    }
  },

  async addClient(clientData) {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate dummy client ID
      const newClientId = Date.now().toString();
      
      // Create new client object
      const newClient = {
        id: newClientId,
        ...clientData,
        totalOutstanding: 0,
        totalPaid: 0,
        status: 'active',
        pendingFiles: 0,
        createdAt: new Date().toISOString()
      };

      return {
        success: true,
        client: newClient,
        message: 'Client added successfully'
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to add client');
    }
  },

  async getClientById(clientId) {
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/clients/${clientId}`, {
        method: 'GET',
        headers
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch client details');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error occurred');
    }
  },

  async updateClient(clientId, clientData) {
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/clients/${clientId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(clientData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update client');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error occurred');
    }
  },

  async deleteClient(clientId) {
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/clients/${clientId}`, {
        method: 'DELETE',
        headers
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete client');
      }

      return { success: true };
    } catch (error) {
      throw new Error(error.message || 'Network error occurred');
    }
  },

  async getDashboardStats() {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Return dummy dashboard stats
      return {
        totalEarnings: 125000,
        monthlyEarnings: 45000,
        totalClients: 25,
        pendingFiles: 8,
        completedTasks: 45,
        overduePayments: 3,
        recentActivity: [
          {
            id: '1',
            type: 'file_approved',
            message: 'Client A approved file',
            time: '2 hours ago'
          },
          {
            id: '2',
            type: 'payment_received',
            message: 'Payment received from Client B',
            time: '1 day ago'
          },
          {
            id: '3',
            type: 'task_assigned',
            message: 'New task assigned',
            time: '3 days ago'
          }
        ]
      };
    } catch (error) {
      throw new Error(error.message || 'Failed to fetch dashboard stats');
    }
  },

  async searchClients(query) {
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/clients/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to search clients');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error occurred');
    }
  },

  async getClientFiles(clientId) {
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/clients/${clientId}/files`, {
        method: 'GET',
        headers
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch client files');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error occurred');
    }
  },

  async getClientPayments(clientId) {
    try {
      const headers = await getAuthHeaders();
      
      const response = await fetch(`${API_BASE_URL}/clients/${clientId}/payments`, {
        method: 'GET',
        headers
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch client payments');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error occurred');
    }
  }
}; 
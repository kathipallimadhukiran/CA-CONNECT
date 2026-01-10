// Add this function to your clientController.js file

exports.checkDuplicate = async (req, res) => {
  try {
    const { field, value, caUserName } = req.query;

    if (!field || !value || !caUserName) {
      return res.status(400).json({ exists: false });
    }

    let query = { caUserName };

    // Normalize value
    const normalized = value.trim();

    switch (field) {
      case 'businessName':
      case 'email':
      case 'firstName':
      case 'lastName':
        query[field] = { $regex: `^${normalized}$`, $options: 'i' };
        break;

      case 'phone':
      case 'whatsappNumber':
        query.$or = [
          { phone: normalized },
          { whatsappNumber: normalized }
        ];
        break;

      case 'gstNumber':
      case 'panNumber':
        query[field] = normalized.toUpperCase();
        break;

      case 'fullName': {
        const [firstName, lastName] = normalized.split(' ');
        if (firstName && lastName) {
          query.firstName = { $regex: `^${firstName}$`, $options: 'i' };
          query.lastName = { $regex: `^${lastName}$`, $options: 'i' };
        } else {
          query.firstName = { $regex: `^${normalized}$`, $options: 'i' };
        }
        break;
      }

      default:
        return res.json({ exists: false });
    }

    const Client = require('../models/Client');
    const exists = await Client.exists(query);

    console.log(`Duplicate check - Field: ${field}, Value: ${value}, Query:`, query, 'Exists:', !!exists);

    return res.json({ exists: !!exists });

  } catch (error) {
    console.error('Duplicate check error:', error);
    return res.status(500).json({ exists: false });
  }
};

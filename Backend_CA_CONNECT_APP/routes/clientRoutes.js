// Add this route to your clientRoutes.js file

const { checkDuplicate } = require('../controllers/clientController');

// Add this line to your routes
router.get('/check-duplicate', checkDuplicate);

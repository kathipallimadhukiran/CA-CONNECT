const Payment = require('../models/Payment');

/**
 * Get payment summary for a client by aggregating payment records
 * This is the single source of truth for all payment calculations
 */
module.exports = async function getPaymentSummary(clientId) {
  const summary = await Payment.aggregate([
    { $match: { clientId } },
    {
      $group: {
        _id: null,
        totalAdded: {
          $sum: { $cond: [{ $eq: ["$type", "outstanding"] }, "$amount", 0] }
        },
        totalPaidOutstanding: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$type", "outstanding"] },
                  { $eq: ["$status", "completed"] }
                ]
              },
              "$amount",
              0
            ]
          }
        },
        manualPaid: {
          $sum: { $cond: [{ $eq: ["$type", "manual"] }, "$amount", 0] }
        }
      }
    }
  ]);

  const s = summary[0] || {};
  const totalAdded = s.totalAdded || 0;
  const totalPaid = (s.totalPaidOutstanding || 0) + (s.manualPaid || 0);

  return {
    totalAdded,
    totalPaid,
    totalOutstanding: Math.max(totalAdded - totalPaid, 0)
  };
};

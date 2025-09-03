const express = require('express');
const { body, validationResult } = require('express-validator');
const CA = require('../models/CA');
const User = require('../models/User');
const Task = require('../models/Task');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/ca/profile
// @desc    Get CA profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const caProfile = await CA.findOne({ userId: req.user._id })
      .populate('userId', 'firstName lastName email phone profilePicture');

    if (!caProfile) {
      return res.status(404).json({ message: 'CA profile not found' });
    }

    res.json(caProfile);
  } catch (error) {
    console.error('Get CA profile error:', error);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
});

// @route   PUT /api/ca/profile
// @desc    Update CA profile
// @access  Private
router.put('/profile', protect, [
  body('specialization').optional().isArray(),
  body('experience').optional().isInt({ min: 0 }),
  body('qualification').optional().trim(),
  body('company').optional().trim(),
  body('bio').optional().trim().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updateFields = {};
    const allowedFields = ['specialization', 'experience', 'qualification', 'company', 'bio', 'address', 'availability'];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateFields[field] = req.body[field];
      }
    });

    const caProfile = await CA.findOneAndUpdate(
      { userId: req.user._id },
      updateFields,
      { new: true, runValidators: true }
    ).populate('userId', 'firstName lastName email phone profilePicture');

    res.json({
      message: 'Profile updated successfully',
      profile: caProfile
    });

  } catch (error) {
    console.error('Update CA profile error:', error);
    res.status(500).json({ message: 'Server error while updating profile' });
  }
});

// @route   POST /api/ca/services
// @desc    Add/Update CA services
// @access  Private
router.post('/services', protect, [
  body('services').isArray(),
  body('services.*.name').notEmpty().trim(),
  body('services.*.description').notEmpty().trim(),
  body('services.*.price').isFloat({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { services } = req.body;

    const caProfile = await CA.findOneAndUpdate(
      { userId: req.user._id },
      { services },
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Services updated successfully',
      services: caProfile.services
    });

  } catch (error) {
    console.error('Update services error:', error);
    res.status(500).json({ message: 'Server error while updating services' });
  }
});

// @route   GET /api/ca/tasks
// @desc    Get CA's tasks
// @access  Private
router.get('/tasks', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, status = '', category = '' } = req.query;

    const filter = { caId: req.user._id };
    if (status) filter.status = status;
    if (category) filter.category = category;

    const tasks = await Task.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Task.countDocuments(filter);

    res.json({
      tasks,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error while fetching tasks' });
  }
});

// @route   POST /api/ca/tasks
// @desc    Create a new task
// @access  Private
router.post('/tasks', protect, [
  body('title').notEmpty().trim(),
  body('description').notEmpty().trim(),
  body('category').isIn(['tax-filing', 'audit', 'accounting', 'consulting', 'compliance', 'other']),
  body('deadline').isISO8601(),
  body('budget.amount').isFloat({ min: 0 }),
  body('estimatedHours').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, category, deadline, budget, estimatedHours } = req.body;

    // Get CA profile
    const caProfile = await CA.findOne({ userId: req.user._id });
    if (!caProfile) {
      return res.status(404).json({ message: 'CA profile not found' });
    }

    // Create task
    const task = new Task({
      title,
      description,
      caId: caProfile._id,
      category,
      deadline,
      budget,
      estimatedHours
    });

    await task.save();

    res.status(201).json({
      message: 'Task created successfully',
      task
    });

  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error while creating task' });
  }
});

// @route   PUT /api/ca/tasks/:taskId/status
// @desc    Update task status
// @access  Private
router.put('/tasks/:taskId/status', protect, [
  body('status').isIn(['pending', 'in-progress', 'completed', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { taskId } = req.params;
    const { status } = req.body;

    // Get CA profile
    const caProfile = await CA.findOne({ userId: req.user._id });
    if (!caProfile) {
      return res.status(404).json({ message: 'CA profile not found' });
    }

    const task = await Task.findOne({ _id: taskId, caId: caProfile._id });
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.status = status;
    if (status === 'completed') {
      task.completedAt = new Date();
    }

    await task.save();

    res.json({
      message: 'Task status updated successfully',
      task
    });

  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({ message: 'Server error while updating task status' });
  }
});

// @route   GET /api/ca/dashboard
// @desc    Get CA dashboard data
// @access  Private
router.get('/dashboard', protect, async (req, res) => {
  try {
    // Get CA profile
    const caProfile = await CA.findOne({ userId: req.user._id });
    if (!caProfile) {
      return res.status(404).json({ message: 'CA profile not found' });
    }

    const caId = caProfile._id;

    // Get counts
    const totalTasks = await Task.countDocuments({ caId });
    const pendingTasks = await Task.countDocuments({ caId, status: 'pending' });
    const inProgressTasks = await Task.countDocuments({ caId, status: 'in-progress' });
    const completedTasks = await Task.countDocuments({ caId, status: 'completed' });

    // Get recent tasks
    const recentTasks = await Task.find({ caId })
      .sort({ createdAt: -1 })
      .limit(5);

    // Get upcoming deadlines
    const upcomingDeadlines = await Task.find({
      caId,
      status: { $in: ['pending', 'in-progress'] },
      deadline: { $gte: new Date() }
    })
    .sort({ deadline: 1 })
    .limit(5);

    res.json({
      counts: {
        total: totalTasks,
        pending: pendingTasks,
        inProgress: inProgressTasks,
        completed: completedTasks
      },
      recentTasks,
      upcomingDeadlines
    });

  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error while fetching dashboard data' });
  }
});

module.exports = router; 
const express = require('express');
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const CA = require('../models/CA');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/task/:taskId
// @desc    Get task details
// @access  Private (CA who owns the task)
router.get('/:taskId', protect, async (req, res) => {
  try {
    const { taskId } = req.params;

    // Get CA profile
    const caProfile = await CA.findOne({ userId: req.user._id });
    if (!caProfile) {
      return res.status(404).json({ message: 'CA profile not found' });
    }

    const task = await Task.findById(taskId);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if CA owns this task
    if (task.caId.toString() !== caProfile._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(task);
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({ message: 'Server error while fetching task' });
  }
});

// @route   PUT /api/task/:taskId
// @desc    Update task details
// @access  Private (CA who owns the task)
router.put('/:taskId', protect, [
  body('title').optional().trim(),
  body('description').optional().trim(),
  body('deadline').optional().isISO8601(),
  body('estimatedHours').optional().isInt({ min: 0 }),
  body('actualHours').optional().isInt({ min: 0 }),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { taskId } = req.params;
    const updateFields = req.body;

    // Get CA profile
    const caProfile = await CA.findOne({ userId: req.user._id });
    if (!caProfile) {
      return res.status(404).json({ message: 'CA profile not found' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if CA owns this task
    if (task.caId.toString() !== caProfile._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only allow certain fields to be updated
    const allowedFields = ['title', 'description', 'deadline', 'estimatedHours', 'actualHours', 'priority'];
    const filteredUpdates = {};
    
    allowedFields.forEach(field => {
      if (updateFields[field] !== undefined) {
        filteredUpdates[field] = updateFields[field];
      }
    });

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      filteredUpdates,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Task updated successfully',
      task: updatedTask
    });

  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error while updating task' });
  }
});

// @route   DELETE /api/task/:taskId
// @desc    Delete task (only if status is pending)
// @access  Private (CA who owns the task)
router.delete('/:taskId', protect, async (req, res) => {
  try {
    const { taskId } = req.params;

    // Get CA profile
    const caProfile = await CA.findOne({ userId: req.user._id });
    if (!caProfile) {
      return res.status(404).json({ message: 'CA profile not found' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if CA owns this task
    if (task.caId.toString() !== caProfile._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Only allow deletion if status is pending
    if (task.status !== 'pending') {
      return res.status(400).json({ message: 'Can only delete pending tasks' });
    }

    await Task.findByIdAndDelete(taskId);

    res.json({ message: 'Task deleted successfully' });

  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ message: 'Server error while deleting task' });
  }
});

// @route   POST /api/task/:taskId/files
// @desc    Upload files for task
// @access  Private (CA who owns the task)
router.post('/:taskId/files', protect, [
  body('files').isArray(),
  body('files.*.name').notEmpty().trim(),
  body('files.*.url').notEmpty().trim(),
  body('files.*.type').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { taskId } = req.params;
    const { files } = req.body;

    // Get CA profile
    const caProfile = await CA.findOne({ userId: req.user._id });
    if (!caProfile) {
      return res.status(404).json({ message: 'CA profile not found' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if CA owns this task
    if (task.caId.toString() !== caProfile._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Add files
    const filesWithTimestamp = files.map(file => ({
      ...file,
      uploadedAt: new Date()
    }));

    task.files.push(...filesWithTimestamp);
    await task.save();

    res.json({
      message: 'Files uploaded successfully',
      files: task.files
    });

  } catch (error) {
    console.error('Upload files error:', error);
    res.status(500).json({ message: 'Server error while uploading files' });
  }
});

// @route   DELETE /api/task/:taskId/files/:fileId
// @desc    Delete file from task
// @access  Private (CA who owns the task)
router.delete('/:taskId/files/:fileId', protect, async (req, res) => {
  try {
    const { taskId, fileId } = req.params;

    // Get CA profile
    const caProfile = await CA.findOne({ userId: req.user._id });
    if (!caProfile) {
      return res.status(404).json({ message: 'CA profile not found' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if CA owns this task
    if (task.caId.toString() !== caProfile._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const fileIndex = task.files.findIndex(file => file._id.toString() === fileId);
    if (fileIndex === -1) {
      return res.status(404).json({ message: 'File not found' });
    }

    task.files.splice(fileIndex, 1);
    await task.save();

    res.json({
      message: 'File deleted successfully',
      files: task.files
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ message: 'Server error while deleting file' });
  }
});

// @route   POST /api/task/:taskId/milestones
// @desc    Add milestone to task
// @access  Private (CA who owns the task)
router.post('/:taskId/milestones', protect, [
  body('title').notEmpty().trim(),
  body('description').notEmpty().trim(),
  body('dueDate').isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { taskId } = req.params;
    const { title, description, dueDate } = req.body;

    // Get CA profile
    const caProfile = await CA.findOne({ userId: req.user._id });
    if (!caProfile) {
      return res.status(404).json({ message: 'CA profile not found' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if CA owns this task
    if (task.caId.toString() !== caProfile._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const milestone = {
      title,
      description,
      dueDate: new Date(dueDate),
      completed: false
    };

    task.milestones.push(milestone);
    await task.save();

    res.json({
      message: 'Milestone added successfully',
      milestones: task.milestones
    });

  } catch (error) {
    console.error('Add milestone error:', error);
    res.status(500).json({ message: 'Server error while adding milestone' });
  }
});

// @route   PUT /api/task/:taskId/milestones/:milestoneId
// @desc    Update milestone status
// @access  Private (CA who owns the task)
router.put('/:taskId/milestones/:milestoneId', protect, [
  body('completed').isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { taskId, milestoneId } = req.params;
    const { completed } = req.body;

    // Get CA profile
    const caProfile = await CA.findOne({ userId: req.user._id });
    if (!caProfile) {
      return res.status(404).json({ message: 'CA profile not found' });
    }

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if CA owns this task
    if (task.caId.toString() !== caProfile._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const milestone = task.milestones.id(milestoneId);
    if (!milestone) {
      return res.status(404).json({ message: 'Milestone not found' });
    }

    milestone.completed = completed;
    if (completed) {
      milestone.completedAt = new Date();
    } else {
      milestone.completedAt = undefined;
    }

    await task.save();

    res.json({
      message: 'Milestone updated successfully',
      milestones: task.milestones
    });

  } catch (error) {
    console.error('Update milestone error:', error);
    res.status(500).json({ message: 'Server error while updating milestone' });
  }
});

module.exports = router; 
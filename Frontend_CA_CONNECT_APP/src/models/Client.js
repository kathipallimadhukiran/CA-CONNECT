class Client {
  constructor({
    id = Math.random().toString(36).substr(2, 9),
    name = '',
    email = '',
    phone = '',
    address = '',
    gstNumber = '',
    panNumber = '',
    files = [],
    payments = [],
    tasks = [],
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
  } = {}) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.phone = phone;
    this.address = address;
    this.gstNumber = gstNumber;
    this.panNumber = panNumber;
    this.files = files;
    this.payments = payments;
    this.tasks = tasks;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  // Calculate total payments made by the client
  getTotalPaid() {
    return this.payments.reduce((total, payment) => total + payment.amount, 0);
  }

  // Calculate pending amount
  getPendingAmount(totalAmount) {
    return totalAmount - this.getTotalPaid();
  }

  // Add a new payment
  addPayment(payment) {
    this.payments.push({
      id: Math.random().toString(36).substr(2, 9),
      amount: payment.amount,
      date: new Date().toISOString(),
      mode: payment.mode || 'Cash',
      reference: payment.reference || '',
      notes: payment.notes || '',
    });
    this.updatedAt = new Date().toISOString();
  }

  // Add a new file
  addFile(file) {
    this.files.push({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.type || 'document',
      url: file.url,
      uploadedAt: new Date().toISOString(),
      status: 'pending', // pending, approved, rejected
    });
    this.updatedAt = new Date().toISOString();
  }

  // Add a new task
  addTask(task) {
    this.tasks.push({
      id: Math.random().toString(36).substr(2, 9),
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate || null,
      status: 'pending', // pending, in-progress, completed
      priority: task.priority || 'medium', // low, medium, high
      assignedTo: task.assignedTo || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    this.updatedAt = new Date().toISOString();
  }

  // Update client details
  updateDetails(details) {
    Object.keys(details).forEach((key) => {
      if (key in this && !['id', 'createdAt', 'updatedAt'].includes(key)) {
        this[key] = details[key];
      }
    });
    this.updatedAt = new Date().toISOString();
  }
}

export default Client;

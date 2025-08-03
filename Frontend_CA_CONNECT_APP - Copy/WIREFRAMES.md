# 🎨 CA Connect - Wireframe Documentation

## 📱 Screen-by-Screen Wireframe Specifications

### **1. Login Screen**
**Layout:**
```
┌─────────────────────────────────┐
│                                 │
│        [CA Connect Logo]        │
│                                 │
│    Smart Client Management      │
│    for Chartered Accountants    │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 📧 Email Address           │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 🔒 Password                │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │        [LOGIN]              │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │    Login with Phone Number  │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │    Forgot Password?         │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │    Create New Account       │ │
│  └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**Key Elements:**
- Clean, professional logo placement
- Email and password input fields
- Primary login button
- Alternative login options
- Forgot password link
- Sign up option

---

### **2. Home Screen (Dashboard)**
**Layout:**
```
┌─────────────────────────────────┐
│ 🔔 [Notifications] [Profile]    │
├─────────────────────────────────┤
│                                 │
│    Welcome back, [CA Name]      │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 📊 Total Earnings: ₹50,000  │ │
│  │    [Earnings Chart]         │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ ⚡ Quick Actions            │ │
│  │                             │ │
│  │ [📞 Call] [📋 Add Client]   │ │
│  │ [📁 Files] [💰 Payments]    │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 📈 This Month's Stats       │ │
│  │                             │ │
│  │ Clients: 25    Files: 150   │ │
│  │ Pending: 8     Paid: ₹35K   │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 🔔 Recent Notifications     │ │
│  │ • Client A approved file    │ │
│  │ • Payment received from B   │ │
│  │ • New task assigned         │ │
│  └─────────────────────────────┘ │
│                                 │
│ [🏠] [👥] [💰] [📞] [✅] [⚙️]   │
└─────────────────────────────────┘
```

**Key Elements:**
- Header with notifications and profile
- Welcome message
- Earnings chart with total amount
- Quick action buttons
- Monthly statistics cards
- Recent notifications list
- Bottom navigation

---

### **3. Add Client Screen**
**Layout:**
```
┌─────────────────────────────────┐
│ ← [Add New Client]              │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 👤 Client Name              │ │
│  │ [_________________________] │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 📧 Email Address            │ │
│  │ [_________________________] │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 📱 Phone Number             │ │
│  │ [_________________________] │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 🏢 Business Address         │ │
│  │ [_________________________] │ │
│  │ [_________________________] │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 🏷️ GST Number (Optional)    │ │
│  │ [_________________________] │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 🏪 Business Type            │ │
│  │ [_________________________] │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │        [ADD CLIENT]          │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 📋 Auto-generate ticket file│ │
│  │ 📧 Send email notification  │ │
│  └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**Key Elements:**
- Form fields for all client information
- Optional GST number field
- Business type dropdown
- Add client button
- Auto-generation features listed
- Clear form validation

---

### **4. Client List Screen**
**Layout:**
```
┌─────────────────────────────────┐
│ 🔍 [Search] [Filter] [Sort]     │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 👤 ABC Company Ltd.         │ │
│  │ 📍 Mumbai, Maharashtra      │ │
│  │                             │ │
│  │ [📞] [📁] [⏳ 3 Pending]    │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 👤 XYZ Traders              │ │
│  │ 📍 Delhi, NCR               │ │
│  │                             │ │
│  │ [📞] [📁] [✅ All Clear]    │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 👤 PQR Solutions            │ │
│  │ 📍 Bangalore, Karnataka     │ │
│  │                             │ │
│  │ [📞] [📁] [⚠️ 5 Overdue]    │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 👤 LMN Enterprises          │ │
│  │ 📍 Chennai, Tamil Nadu      │ │
│  │                             │ │
│  │ [📞] [📁] [⏳ 2 Pending]    │ │
│  └─────────────────────────────┘ │
│                                 │
│ [🏠] [👥] [💰] [📞] [✅] [⚙️]   │
└─────────────────────────────────┘
```

**Key Elements:**
- Search and filter options
- Client cards with name and address
- Action buttons (call, download, status)
- Status indicators (pending, clear, overdue)
- Bottom navigation

---

### **5. Client Details Screen**
**Layout:**
```
┌─────────────────────────────────┐
│ ← [Client Name] [Edit] [Menu]   │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 👤 Client Information       │ │
│  │ 📧 email@company.com        │ │
│  │ 📱 +91 98765 43210          │ │
│  │ 🏷️ GST: 27ABCDE1234F1Z5    │ │
│  │ 📍 Mumbai, Maharashtra      │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 💰 Payment Summary          │ │
│  │ Total Outstanding: ₹25,000  │ │
│  │ Total Paid: ₹75,000         │ │
│  │ Last Payment: 15 Jan 2024   │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 📁 Files (12)               │ │
│  │                             │ │
│  │ 📄 Tax Return 2023-24       │ │
│  │ 📄 GST Return - Dec 2023    │ │
│  │ 📄 Invoice - Jan 2024       │ │
│  │ 📄 Receipt - Payment #123   │ │
│  │ [View All Files]            │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 📞 Recent Calls             │ │
│  │ 15 Jan 2024 - 10:30 AM      │ │
│  │ 10 Jan 2024 - 2:15 PM       │ │
│  │ [View Call History]         │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ [📞 Call Now] [📧 Message]  │ │
│  │ [📁 Upload File] [💰 Payment]│ │
│  └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**Key Elements:**
- Client header with edit and menu options
- Complete client information
- Payment summary with amounts
- File list with recent documents
- Call history
- Action buttons at bottom

---

### **6. Payment Screen**
**Layout:**
```
┌─────────────────────────────────┐
│ 💰 [Payments] [Filter] [Sort]   │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 📊 Payment Overview         │ │
│  │ Total Outstanding: ₹1,25,000│ │
│  │ This Month: ₹45,000         │ │
│  │ Overdue: ₹15,000            │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 👤 ABC Company Ltd.         │ │
│  │ Outstanding: ₹25,000        │ │
│  │ Due: 20 Jan 2024            │ │
│  │                             │ │
│  │ [📱 Send Reminder] [💰 Mark Paid]│ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 👤 XYZ Traders              │ │
│  │ Outstanding: ₹15,000        │ │
│  │ Due: 25 Jan 2024            │ │
│  │                             │ │
│  │ [📱 Send Reminder] [💰 Mark Paid]│ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 👤 PQR Solutions            │ │
│  │ Outstanding: ₹35,000        │ │
│  │ ⚠️ OVERDUE: 10 Jan 2024     │ │
│  │                             │ │
│  │ [📱 Send Reminder] [💰 Mark Paid]│ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ [Sort: Low to High] [High to Low]│ │
│  │ [Date] [Amount] [Status]    │ │
│  └─────────────────────────────┘ │
│                                 │
│ [🏠] [👥] [💰] [📞] [✅] [⚙️]   │
└─────────────────────────────────┘
```

**Key Elements:**
- Payment overview summary
- Client payment cards
- Outstanding amounts and due dates
- Action buttons for each client
- Sorting and filtering options
- Overdue payment indicators

---

### **7. Call Screen**
**Layout:**
```
┌─────────────────────────────────┐
│ 📞 [Call Directory] [Search]    │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 👤 ABC Company Ltd.         │ │
│  │ 📱 +91 98765 43210          │ │
│  │ 📧 abc@company.com          │ │
│  │                             │ │
│  │ [📞 Call] [📧 Email] [📱 SMS]│ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 👤 XYZ Traders              │ │
│  │ 📱 +91 87654 32109          │ │
│  │ 📧 xyz@traders.com          │ │
│  │                             │ │
│  │ [📞 Call] [📧 Email] [📱 SMS]│ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 👤 PQR Solutions            │ │
│  │ 📱 +91 76543 21098          │ │
│  │ 📧 pqr@solutions.com        │ │
│  │                             │ │
│  │ [📞 Call] [📧 Email] [📱 SMS]│ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 👤 LMN Enterprises          │ │
│  │ 📱 +91 65432 10987          │ │
│  │ 📧 lmn@enterprises.com      │ │
│  │                             │ │
│  │ [📞 Call] [📧 Email] [📱 SMS]│ │
│  └─────────────────────────────┘ │
│                                 │
│ [🏠] [👥] [💰] [📞] [✅] [⚙️]   │
└─────────────────────────────────┘
```

**Key Elements:**
- Client directory with contact info
- Multiple communication options
- Search functionality
- Quick access to phone, email, SMS
- Bottom navigation

---

### **8. Task Management Screen**
**Layout:**
```
┌─────────────────────────────────┐
│ ✅ [Tasks] [+ Add Task] [Filter]│
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 🔴 High Priority            │ │
│  │ 📋 Complete Tax Filing      │ │
│  │ 👤 Assigned to: John Doe    │ │
│  │ 📅 Due: 25 Jan 2024         │ │
│  │                             │ │
│  │ [✅ Complete] [📝 Edit] [❌ Delete]│ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 🟡 Medium Priority          │ │
│  │ 📋 Review GST Returns       │ │
│  │ 👤 Assigned to: Jane Smith  │ │
│  │ 📅 Due: 30 Jan 2024         │ │
│  │                             │ │
│  │ [✅ Complete] [📝 Edit] [❌ Delete]│ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 🟢 Low Priority             │ │
│  │ 📋 Update Client Database   │ │
│  │ 👤 Assigned to: Mike Johnson│ │
│  │ 📅 Due: 5 Feb 2024          │ │
│  │                             │ │
│  │ [✅ Complete] [📝 Edit] [❌ Delete]│ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ ✅ Completed                │ │
│  │ 📋 Send Payment Reminders   │ │
│  │ 👤 Completed by: John Doe   │ │
│  │ 📅 Completed: 20 Jan 2024   │ │
│  └─────────────────────────────┘ │
│                                 │
│ [🏠] [👥] [💰] [📞] [✅] [⚙️]   │
└─────────────────────────────────┘
```

**Key Elements:**
- Task list with priority indicators
- Assignment information
- Due dates and completion status
- Action buttons for each task
- Filter options
- Add task button

---

### **9. Add Task Screen**
**Layout:**
```
┌─────────────────────────────────┐
│ ← [Add New Task]                │
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 📋 Task Title               │ │
│  │ [_________________________] │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 📝 Description              │ │
│  │ [_________________________] │ │
│  │ [_________________________] │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 👤 Assign To                │ │
│  │ [Select Staff Member ▼]     │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 🚨 Priority                 │ │
│  │ ○ Low  ○ Medium  ● High    │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 📅 Due Date                 │ │
│  │ [Select Date] [Select Time] │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 📎 Attachments              │ │
│  │ [Add File] [Add File]       │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │        [CREATE TASK]         │ │
│  └─────────────────────────────┘ │
└─────────────────────────────────┘
```

**Key Elements:**
- Task title and description fields
- Staff assignment dropdown
- Priority selection
- Due date and time picker
- File attachment options
- Create task button

---

### **10. Client App - Home Screen**
**Layout:**
```
┌─────────────────────────────────┐
│ 🔔 [Notifications] [Profile]    │
├─────────────────────────────────┤
│                                 │
│    Welcome, [Client Name]       │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 💰 Payment Status           │ │
│  │ Outstanding: ₹15,000        │ │
│  │ Due: 25 Jan 2024            │ │
│  │ [View Details]              │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 📁 Recent Files             │ │
│  │ 📄 Tax Return 2023-24       │ │
│  │ 📄 GST Return - Dec 2023    │ │
│  │ [View All Files]            │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ ⏳ Pending Approvals         │ │
│  │ 📄 Invoice - Jan 2024       │ │
│  │ [Approve] [Reject]          │ │
│  └─────────────────────────────┘ │
│                                 │
│  ┌─────────────────────────────┐ │
│  │ 📊 Monthly Statistics       │ │
│  │ Files: 12    Payments: 8    │ │
│  │ [View Detailed Report]      │ │
│  └─────────────────────────────┘ │
│                                 │
│ [🏠] [📁] [💰] [📞] [📊] [⚙️]   │
└─────────────────────────────────┘
```

**Key Elements:**
- Simplified client interface
- Payment status overview
- Recent files list
- Pending approvals section
- Monthly statistics
- Bottom navigation

---

## 🎨 Design System

### **Color Palette:**
- **Primary Blue**: #2563EB (Main brand color)
- **Secondary Green**: #10B981 (Success, positive actions)
- **Warning Orange**: #F59E0B (Warnings, pending items)
- **Error Red**: #EF4444 (Errors, overdue items)
- **Neutral Gray**: #6B7280 (Text, secondary information)
- **Background**: #F9FAFB (Light background)
- **Card Background**: #FFFFFF (White cards)

### **Typography:**
- **Headings**: Inter Bold, 18-24px
- **Body Text**: Inter Regular, 14-16px
- **Small Text**: Inter Regular, 12px
- **Button Text**: Inter Medium, 14px

### **Spacing:**
- **Small**: 8px
- **Medium**: 16px
- **Large**: 24px
- **Extra Large**: 32px

### **Border Radius:**
- **Small**: 4px (Input fields)
- **Medium**: 8px (Cards)
- **Large**: 12px (Buttons)

### **Shadows:**
- **Light**: 0 1px 3px rgba(0,0,0,0.1)
- **Medium**: 0 4px 6px rgba(0,0,0,0.1)
- **Heavy**: 0 10px 15px rgba(0,0,0,0.1)

---

## 📱 Responsive Design

### **Mobile-First Approach:**
- All screens designed for mobile devices first
- Touch-friendly button sizes (minimum 44px)
- Adequate spacing for finger navigation
- Swipe gestures for common actions

### **Tablet Adaptations:**
- Larger card layouts
- Side-by-side content where appropriate
- Enhanced navigation patterns
- Optimized for touch and mouse interaction

### **Accessibility:**
- High contrast ratios for text
- Large touch targets
- Screen reader compatibility
- Keyboard navigation support
- Color-blind friendly design

---

**This wireframe documentation provides detailed specifications for creating the UI/UX design of the CA Connect application. Use these specifications to guide the development of high-fidelity mockups and prototypes.** 
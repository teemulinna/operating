# Manual Testing Checklist - Resource Allocation System

**Test Date**: _________  
**Tester**: _________  
**Environment**: Development (localhost)

## 🌐 System URLs
- **Frontend**: http://localhost:3003
- **Backend**: http://localhost:3001  
- **Test API**: http://localhost:3002

---

## ✅ Pre-Test Verification

□ **Frontend accessible**: Visit http://localhost:3003  
□ **Backend health check**: Visit http://localhost:3001/health  
□ **Real data confirmed**: 3 employees, 5 projects, 3 allocations

---

## 📋 User Story Testing

### 1️⃣ View All Employees and Current Allocations

□ **Navigate to employees section**  
□ **Verify 3 employees displayed**:
  - □ John Doe (Software Engineer)
  - □ Jane Smith (Marketing Manager) 
  - □ Mike Johnson (Sales Representative)
□ **Check allocation percentages visible**  
□ **Screenshot**: `employees-view.png`

**Notes**: ________________________________

---

### 2️⃣ View All Projects and Assigned Resources

□ **Navigate to projects section**  
□ **Verify 5 projects displayed**:
  - □ Budget Calc Project
  - □ Integration Test Project
  - □ Validation Success Project
  - □ Final Validation Project
  - □ Project Resource Integration Test
□ **Check assigned resources shown**  
□ **Screenshot**: `projects-view.png`

**Notes**: ________________________________

---

### 3️⃣ Create New Allocation: John Doe → Budget Calc Project (30%)

□ **Click "Create Allocation" button**  
□ **Select John Doe from dropdown**  
□ **Select Budget Calc Project from dropdown**  
□ **Enter 30% allocation**  
□ **Click Save**  
□ **Verify success message**  
□ **Confirm allocation appears in list**  
□ **Screenshot**: `new-allocation-created.png`

**API Verification**:
□ **Check**: GET http://localhost:3002/api/working-allocations shows new record

**Notes**: ________________________________

---

### 4️⃣ Edit Existing Allocation: Jane Smith (75% → 60%)

□ **Find Jane Smith's allocation row**  
□ **Click Edit button**  
□ **Change percentage from 75% to 60%**  
□ **Click Save**  
□ **Verify updated percentage displayed**  
□ **Screenshot**: `allocation-edited.png`

**API Verification**:
□ **Check**: API shows Jane's allocation at 60%

**Notes**: ________________________________

---

### 5️⃣ Delete Allocation to Free Resources

□ **Find an allocation to delete**  
□ **Click Delete button**  
□ **Confirm deletion in dialog**  
□ **Verify allocation removed from list**  
□ **Screenshot**: `allocation-deleted.png`

**API Verification**:
□ **Check**: API no longer shows deleted allocation

**Notes**: ________________________________

---

### 6️⃣ Detect Allocation Conflicts (130% Overallocation)

□ **Create first allocation**: Mike Johnson → E-commerce Platform (80%)  
□ **Create second allocation**: Mike Johnson → Mobile App Redesign (50%)  
□ **Verify conflict warning displayed**:
  - □ "Overallocation detected" message
  - □ "130%" total shown
  - □ Employee highlighted in red/warning color
□ **Screenshot**: `allocation-conflict.png`

**Notes**: ________________________________

---

### 7️⃣ View Capacity Utilization Dashboard

□ **Navigate to capacity dashboard**  
□ **Verify dashboard elements**:
  - □ Capacity chart visible
  - □ Utilization summary displayed
  - □ Employee utilization percentages shown
□ **Check metrics calculated**:
  - □ Total capacity
  - □ Available capacity
  - □ Overallocated count
□ **Screenshot**: `capacity-dashboard.png`

**Notes**: ________________________________

---

### 8️⃣ Navigate Between Different Views

□ **Test all navigation tabs**:
  - □ Employees tab → Employee list loads
  - □ Projects tab → Project list loads
  - □ Allocations tab → Allocation list loads
  - □ Dashboard tab → Charts load
  - □ Calendar tab → Calendar view loads
□ **Test rapid navigation** (click through tabs quickly)  
□ **Verify state persistence**

**Notes**: ________________________________

---

### 9️⃣ Error Handling with Invalid Data

□ **Test invalid allocation percentage**:
  - □ Enter 150% → Error message shown
  - □ Enter -10% → Error message shown
  - □ Enter text → Validation error
□ **Test empty form submission**:
  - □ Submit without data → Validation errors
□ **Test network error simulation**:
  - □ Disconnect internet → Network error shown

**Notes**: ________________________________

---

### 🔟 Data Persistence After Page Refresh

□ **Create a new allocation**  
□ **Refresh the page (F5 or Ctrl+R)**  
□ **Verify allocation still exists**  
□ **Open new browser tab**  
□ **Navigate to system → Data consistent**

**API Verification**:
□ **Check**: All data persists across sessions

**Notes**: ________________________________

---

## 🚀 Performance & Usability

□ **Page load time** < 5 seconds  
□ **Navigation responsive** < 1 second  
□ **Forms submit quickly** < 2 seconds  
□ **No JavaScript errors** in console  
□ **Mobile responsive** (resize browser)

---

## 🐛 Issues Found

| Issue # | Description | Severity | Steps to Reproduce |
|---------|-------------|----------|-------------------|
| 1 | | High/Med/Low | |
| 2 | | High/Med/Low | |
| 3 | | High/Med/Low | |

---

## 📊 Test Summary

**Total User Stories**: 10  
**Passed**: ___/10  
**Failed**: ___/10  
**Success Rate**: ____%

**Overall System Status**: 
□ ✅ Ready for Production  
□ ⚠️ Needs Minor Fixes  
□ ❌ Needs Major Work

**Tester Signature**: _________________  
**Date Completed**: _________________

---

## 🎯 Next Steps

□ **Document all issues found**  
□ **Create tickets for fixes needed**  
□ **Schedule follow-up testing**  
□ **Update Playwright tests based on manual findings**

**Testing Complete**: □ Yes □ No
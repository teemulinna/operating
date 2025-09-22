# Gherkin Scenarios - Phase 1: Heat Maps, Availability Patterns & What-If Scenarios

> **Created:** 2025-09-22
> **Project:** ResourceForge Phase 1 Implementation
> **Focus:** Critical user flows for visual resource planning

## Feature 1: Capacity Heat Maps Visualization

### Scenario 1.1: Basic Heat Map Viewing
```gherkin
Feature: Capacity Heat Map Visualization
  As a Resource Manager
  I want to view team capacity as a visual heat map
  So that I can quickly identify over-allocation and availability patterns

  Background:
    Given I am logged in as a Resource Manager
    And I have access to team capacity data
    And there are employees with various allocation levels

  Scenario: View quarterly capacity heat map
    Given I am on the Resource Dashboard
    When I click on "Heat Map" view
    And I select date range "Next 3 months"
    And I select team "Development Team"
    Then I should see a grid showing employees on Y-axis and weeks on X-axis
    And employees with <80% utilization should appear in green
    And employees with 80-100% utilization should appear in yellow
    And employees with >100% utilization should appear in red
    And I should see a legend explaining the color coding

  Scenario: Heat map with over-allocation identification
    Given I am viewing the capacity heat map for next quarter
    When there are employees allocated over 100%
    Then over-allocated employees should be highlighted in red
    And I should see a warning icon next to their names
    And the total over-allocation hours should be displayed

  Scenario: Filter heat map by project
    Given I am viewing the team capacity heat map
    When I select project "Project Alpha" from the filter dropdown
    Then the heat map should only display allocations for Project Alpha
    And the color coding should reflect project-specific utilization
    And unallocated employees should appear as gray or white
    And the legend should update to show "Project Alpha Allocations"

  Scenario: Interactive heat map tooltips
    Given I am viewing the capacity heat map
    When I hover over an employee's allocation cell
    Then I should see a tooltip displaying:
      | Field | Example Value |
      | Employee Name | John Smith |
      | Utilization | 85% (34 hours) |
      | Projects | Project A (20h), Project B (14h) |
      | Available Capacity | 6 hours |
      | Week Date | Week of Oct 15, 2025 |

  Scenario: Export heat map data
    Given I am viewing the capacity heat map
    When I click the "Export" button
    And I select "CSV Format"
    Then a CSV file should be downloaded
    And the file should contain employee names, dates, and utilization percentages
    And the filename should include the date range and team name
```

### Scenario 1.2: Heat Map Performance and Responsiveness
```gherkin
  Scenario: Heat map loads quickly for large teams
    Given I have a team of 50+ employees
    When I view the heat map for 6 months
    Then the heat map should load within 2 seconds
    And scrolling should be smooth
    And zooming should update within 500ms

  Scenario: Mobile responsive heat map
    Given I am viewing the heat map on a mobile device
    When I rotate the device to landscape mode
    Then the heat map should remain readable
    And I should be able to scroll horizontally through time periods
    And tap interactions should work for tooltips
```

---

## Feature 2: Recurring Availability Patterns

### Scenario 2.1: Setting Standard Availability Patterns
```gherkin
Feature: Employee Availability Patterns
  As an Employee or Manager
  I want to set recurring availability patterns
  So that resource planning can account for my regular schedule

  Background:
    Given I am logged in as an Employee or Manager
    And I have permission to manage availability

  Scenario: Set standard full-time work pattern
    Given I am on my employee profile page
    When I click "Edit Availability Pattern"
    And I select template "Standard 40 hours"
    Then the weekly schedule should default to:
      | Day | Start Time | End Time | Available |
      | Monday | 9:00 AM | 5:00 PM | Yes |
      | Tuesday | 9:00 AM | 5:00 PM | Yes |
      | Wednesday | 9:00 AM | 5:00 PM | Yes |
      | Thursday | 9:00 AM | 5:00 PM | Yes |
      | Friday | 9:00 AM | 5:00 PM | Yes |
      | Saturday | -- | -- | No |
      | Sunday | -- | -- | No |
    When I click "Save Pattern"
    Then the pattern should be applied to my availability
    And future resource planning should respect these hours

  Scenario: Set part-time availability pattern
    Given I am editing my availability pattern
    When I select template "Part-time 20 hours"
    And I customize it to work "Monday, Wednesday, Friday 9 AM - 3 PM"
    And I save the pattern
    Then my availability should show 18 hours per week
    And allocation attempts beyond these hours should trigger warnings

  Scenario: Set remote/hybrid work pattern
    Given I am editing my availability pattern
    When I select template "Remote Hybrid"
    And I set office days to "Tuesday, Wednesday, Thursday"
    And I set remote days to "Monday, Friday"
    And I save the pattern
    Then my availability should indicate location preferences
    And project assignments should consider location requirements
```

### Scenario 2.2: Availability Pattern Validation and Conflicts
```gherkin
  Scenario: Detect conflicts with existing allocations
    Given I have existing project allocations
    And I am currently allocated 8 hours on Monday 9 AM - 5 PM
    When I change my availability pattern to "Not available Mondays"
    Then I should see a conflict warning
    And the system should list conflicting allocations:
      | Project | Date | Hours | Conflict |
      | Project A | Monday Oct 21 | 4 hours | Pattern change conflicts |
      | Project B | Monday Oct 28 | 4 hours | Pattern change conflicts |
    And I should have options to:
      - Reassign conflicting allocations
      - Override pattern for specific dates
      - Cancel pattern change

  Scenario: Add vacation exceptions to pattern
    Given I have a standard work pattern set
    When I add an exception for "December 25-31, 2025" as "Vacation"
    Then those dates should show as unavailable
    And any existing allocations during that period should be flagged
    And I should receive suggestions to:
      - Notify affected project managers
      - Reschedule conflicting work
      - Find coverage for critical tasks

  Scenario: Validate pattern against company policies
    Given company policy requires minimum 20 hours per week
    When I try to set a pattern with only 15 hours per week
    Then I should see a validation error
    And the pattern should not be saved
    And I should see the message "Pattern must meet minimum 20 hours per week requirement"
```

---

## Feature 3: What-If Scenario Planning

### Scenario 3.1: Creating and Managing Scenarios
```gherkin
Feature: What-If Scenario Planning
  As a Resource Manager
  I want to create and compare resource allocation scenarios
  So that I can plan optimal resource strategies

  Background:
    Given I am logged in as a Resource Manager
    And I have access to resource planning tools
    And there are existing project allocations

  Scenario: Create new project scenario
    Given I am on the Resource Planning page
    When I click "Create Scenario"
    And I select scenario type "New Project"
    And I enter scenario name "Q1 Mobile App Project"
    And I set parameters:
      | Parameter | Value |
      | Project Duration | 3 months |
      | Required Team Size | 5 developers |
      | Start Date | January 15, 2026 |
      | Skills Required | React Native, iOS, Android |
    And I click "Create Scenario"
    Then a new scenario should be created
    And I should see the scenario in "Draft" status
    And the system should suggest available employees matching required skills

  Scenario: Modify allocations within scenario
    Given I have created a "New Project" scenario
    When I open the scenario editor
    Then I should see current allocations in the left panel
    And proposed scenario changes in the right panel
    When I drag "John Smith (React Native)" from available resources
    And I drop him on "Mobile App Project" for "50% allocation"
    Then the scenario should update with John's allocation
    And I should see the impact on his other project commitments
    And over-allocation warnings should appear if applicable

  Scenario: Compare multiple scenarios side-by-side
    Given I have created scenarios "Option A" and "Option B"
    When I click "Compare Scenarios"
    And I select both scenarios
    Then I should see a comparison view showing:
      | Metric | Option A | Option B | Difference |
      | Total Cost | $45,000 | $52,000 | +$7,000 |
      | Team Utilization | 85% | 92% | +7% |
      | Resource Conflicts | 2 | 0 | -2 |
      | Completion Risk | Medium | Low | Better |
    And I should see visual charts comparing resource utilization
    And recommendations for the optimal choice
```

### Scenario 3.2: Scenario Analysis and Implementation
```gherkin
  Scenario: Analyze scenario feasibility and risks
    Given I have created a resource allocation scenario
    When I click "Analyze Scenario"
    Then I should see an analysis report containing:
      - Resource utilization heatmap for the scenario period
      - Skills coverage analysis (gaps and overlaps)
      - Budget impact calculation
      - Timeline feasibility assessment
      - Risk factors (over-allocation, skills gaps, dependencies)
    And each risk should have severity level (Low/Medium/High)
    And suggested mitigation strategies

  Scenario: Apply approved scenario to real allocations
    Given I have a scenario marked as "Approved"
    And all stakeholders have reviewed the impact
    When I click "Apply Scenario"
    Then I should see a confirmation dialog listing all changes:
      | Change Type | Employee | Project | Impact |
      | New Allocation | John Smith | Mobile App | +20 hours/week |
      | Reduced Allocation | Jane Doe | Web Project | -10 hours/week |
      | Project Start | Mobile App | -- | New project created |
    When I confirm "Apply Changes"
    Then the scenario changes should be applied to real allocations
    And affected employees should receive notifications
    And project managers should be informed of allocation changes
    And an audit log entry should be created

  Scenario: Handle scenario implementation conflicts
    Given I am applying a scenario to real allocations
    When some allocations have changed since scenario creation
    Then I should see a conflict resolution screen
    And conflicting changes should be highlighted
    And I should have options to:
      - Use scenario values (override current changes)
      - Keep current values (skip scenario changes)
      - Manually resolve each conflict
    And the system should validate the final allocation state
```

---

## Feature 4: Integrated Workflow Scenarios

### Scenario 4.1: End-to-End Resource Planning Workflow
```gherkin
Feature: Complete Resource Planning Workflow
  As a Resource Manager
  I want to use heat maps, patterns, and scenarios together
  So that I can make optimal resource allocation decisions

  Scenario: Complete quarterly planning workflow
    Given I am planning resources for Q1 2026

    # Step 1: Analyze current capacity
    When I view the capacity heat map for Q4 2025 and Q1 2026
    Then I can identify current utilization patterns
    And spot upcoming capacity gaps or over-allocations

    # Step 2: Account for availability changes
    When I review employee availability patterns
    Then I can see who has vacation planned
    And identify part-time or remote work constraints

    # Step 3: Model new project scenarios
    When I create a scenario for "Q1 New Client Project"
    And I allocate required resources within the scenario
    Then I can see the impact on team utilization
    And identify potential conflicts or skill gaps

    # Step 4: Compare and optimize
    When I create alternative scenarios with different team compositions
    And I compare them side-by-side
    Then I can choose the optimal resource allocation strategy

    # Step 5: Implement and monitor
    When I apply the chosen scenario
    Then all changes are reflected in real allocations
    And I can monitor actual progress against the plan using heat maps

  Scenario: Emergency resource reallocation
    Given a critical project needs immediate resources
    When I create an "Emergency Reallocation" scenario
    And I use the heat map to identify available capacity
    And I check availability patterns for flexible employees
    Then I can quickly model resource moves
    And implement changes with minimal disruption
    And notify all affected stakeholders automatically
```

### Scenario 4.2: Cross-Feature Integration and Data Consistency
```gherkin
  Scenario: Data consistency across all features
    Given I make changes to an employee's availability pattern
    When the pattern affects existing allocations
    Then the heat map should update to reflect new utilization
    And any active scenarios should show validation warnings
    And resource managers should be notified of impacts

  Scenario: Real-time updates across planning tools
    Given multiple managers are viewing resource planning tools
    When one manager applies a scenario with resource changes
    Then all other managers should see updated heat maps
    And availability calculations should reflect the changes
    And any conflicting scenarios should be marked as outdated
```

---

## Performance and Usability Scenarios

### Scenario 5.1: System Performance Under Load
```gherkin
Feature: System Performance and Scalability
  As a System Administrator
  I want the system to perform well under normal usage
  So that users have a responsive experience

  Scenario: Heat map performance with large datasets
    Given the system has 200+ employees and 50+ projects
    When I load a heat map for 6 months of data
    Then the initial load should complete within 3 seconds
    And scrolling should remain smooth (<100ms lag)
    And filtering should update within 1 second
    And memory usage should remain stable during interaction

  Scenario: Concurrent scenario editing
    Given 10 managers are creating scenarios simultaneously
    When they save their scenarios within the same minute
    Then all scenarios should save successfully
    And there should be no data corruption
    And each manager should see only their own scenarios
    And system response time should remain under 2 seconds
```

### Scenario 5.2: Accessibility and Cross-Platform Compatibility
```gherkin
  Scenario: Keyboard navigation for heat maps
    Given I am using keyboard-only navigation
    When I tab through the heat map interface
    Then all interactive elements should be reachable
    And tooltips should appear when elements receive focus
    And arrow keys should navigate the heat map grid
    And screen readers should announce utilization levels

  Scenario: Mobile heat map interaction
    Given I am using a tablet device
    When I view the heat map
    Then I should be able to pinch-zoom for different granularities
    And tap interactions should show tooltips
    And horizontal scrolling should work smoothly
    And the interface should adapt to portrait/landscape orientation
```

---

## Error Handling and Edge Cases

### Scenario 6.1: Error Recovery and Data Validation
```gherkin
Feature: Robust Error Handling
  As a User
  I want clear error messages and recovery options
  So that I can resolve issues and continue working

  Scenario: Handle network errors during scenario creation
    Given I am creating a complex scenario
    When the network connection is lost during save
    Then I should see a clear error message
    And my work should be preserved in local storage
    And I should have an option to retry the save
    And the system should resume once connectivity returns

  Scenario: Validate impossible allocation scenarios
    Given I am creating a scenario that requires 150% utilization
    When I try to save the scenario
    Then I should see validation errors clearly explaining the issues
    And suggested fixes should be provided
    And I should be able to auto-fix violations where possible

  Scenario: Handle deleted employee during scenario application
    Given I have a scenario with employee allocations
    When an employee is deleted from the system
    And I try to apply the scenario
    Then I should see a warning about the deleted employee
    And be given options to reassign their work
    And proceed with partial implementation if desired
```

---

## Integration Testing Scenarios

### Scenario 7.1: Third-Party Integration Compatibility
```gherkin
Feature: External System Integration
  As a System Administrator
  I want the new features to work with existing integrations
  So that our workflow remains seamless

  Scenario: Calendar integration with availability patterns
    Given an employee has Google Calendar integration enabled
    When they set an availability pattern with "Not available Fridays"
    Then their calendar should show Friday blocks
    And calendar events should respect availability patterns
    And changes in either system should sync bidirectionally

  Scenario: Time tracking integration with scenarios
    Given we use Harvest for time tracking
    When a scenario is applied that changes project allocations
    Then new Harvest projects should be created if needed
    And employee time tracking assignments should update
    And historical time data should remain intact
```

---

These comprehensive Gherkin scenarios cover all critical user flows for Phase 1 implementation, providing clear acceptance criteria for:

1. **Capacity Heat Maps** - Visual resource planning with performance requirements
2. **Availability Patterns** - Recurring schedule management with conflict detection
3. **What-If Scenarios** - Strategic planning with comparison and implementation
4. **Integrated Workflows** - End-to-end resource management processes
5. **Performance & Usability** - System reliability and user experience
6. **Error Handling** - Robust error recovery and validation
7. **Integration** - Compatibility with existing systems

Each scenario includes specific data examples, expected outcomes, and measurable criteria that can be directly implemented as automated tests during development.
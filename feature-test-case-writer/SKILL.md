---
name: feature-test-case-writer
description: 'Turn a product plan into QA-ready feature test cases for the taxi rental app.'
argument-hint: Which feature or phase should I test?
disable-model-invocation: true
---
Related skill: `agent-customization`. Use the workflow pattern and keep quality checks explicit and reusable.

Use this skill to translate the project plan into executable feature test cases for the taxi rental operations system.

## Inputs
Review the project requirements and plan, especially `plan.md`, then extract the behaviors to validate.

Focus on:
- user-visible features
- validation rules
- role-based permissions
- operational edge cases
- reporting and notification flows

## Extract Features
For each phase in the plan, identify:
- the business goal
- the user or role affected
- the expected behavior
- the data and conditions required
- the acceptance criteria

## Build Test Cases
Create a QA-ready test case for each feature with:
- Feature name
- Priority
- Preconditions
- Test steps
- Expected result
- Actual result notes
- Edge cases or risk scenarios

Cover the main phases from the plan:
- booking creation and assignment
- dashboard overview and metrics
- document expiry tracking and alerts
- maintenance tracking
- role-based access control
- reports and exports
- notification and security workflows

## Clarify if Needed
If the feature is not yet specific enough, ask:
- What specific result or functionality should this skill achieve for the user?
- Is the user testing one feature or the full release?
- Should the output be a brief QA matrix or a full detailed checklist?

## Output Format
Produce a markdown feature test matrix with columns like:
- ID
- Feature
- Priority
- Preconditions
- Steps
- Expected Result
- Edge Cases

## Completion Criteria
The skill is complete when the generated test cases:
- map directly to the plan
- cover happy paths and validation failures
- include role and permission checks
- reflect business risk and operational impact
- are ready for a QA or engineering handoff

Remember to keep the test cases focused on real user behavior and the actual product goals defined in the plan.

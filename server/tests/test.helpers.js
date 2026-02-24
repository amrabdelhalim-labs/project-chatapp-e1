/**
 * Shared test utilities for all test suites
 */

export const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

export const state = {
  total: 0,
  passed: 0,
  failed: 0,
  reset() {
    this.total = 0;
    this.passed = 0;
    this.failed = 0;
  },
};

export function assert(condition, message) {
  state.total++;
  if (condition) {
    state.passed++;
    console.log(`${colors.green}✓ PASS${colors.reset} ${message}`);
  } else {
    state.failed++;
    console.log(`${colors.red}✗ FAIL${colors.reset} ${message}`);
  }
}

export function logSection(title) {
  console.log(
    `\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
  );
  console.log(`${colors.blue}${title}${colors.reset}`);
  console.log(
    `${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`
  );
}

export function logStep(stepNumber, description) {
  console.log(`\n${colors.yellow}[${stepNumber}]${colors.reset} ${description}`);
}

export function printSummary() {
  console.log(`\n${'━'.repeat(50)}`);
  console.log(`${colors.blue}Total:${colors.reset}  ${state.total}`);
  console.log(`${colors.green}Passed:${colors.reset} ${state.passed}`);
  console.log(`${colors.red}Failed:${colors.reset} ${state.failed}`);
  const rate = state.total > 0 ? ((state.passed / state.total) * 100).toFixed(1) : '0.0';
  console.log(`${colors.cyan}Rate:${colors.reset}   ${rate}%`);

  if (state.failed === 0) {
    console.log(`\n${colors.green}✓ All tests passed!${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠ ${state.failed} test(s) failed.${colors.reset}`);
  }
}

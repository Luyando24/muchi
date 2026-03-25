
import { normalizeClassName, findBestClassMatch } from '../server/lib/class-matching.js';

const testCases = [
  { input: "11T3", expected: "11t3" },
  { input: "11 T3", expected: "11t3" },
  { input: "Grade 11 T3", expected: "11t3" },
  { input: "Form 4 Blue", expected: "4blue" },
  { input: "Class 10-A", expected: "10a" },
  { input: "Level 1", expected: "1" },
  { input: "Year 2024", expected: "2024" },
];

console.log("--- Testing normalizeClassName ---");
testCases.forEach(({ input, expected }) => {
  const result = normalizeClassName(input);
  const passed = result === expected;
  console.log(`${passed ? "✅" : "❌"} Input: "${input}", Expected: "${expected}", Result: "${result}"`);
});

const classes = [
  { id: "1", name: "11 T3" },
  { id: "2", name: "Grade 10A" },
  { id: "3", name: "Form 4 Blue" },
  { id: "4", name: "8B" },
];

const matchingTestCases = [
  { input: "11T3", expectedId: "1" },
  { input: "11 T3", expectedId: "1" },
  { input: "10A", expectedId: "2" },
  { input: "Grade 10A", expectedId: "2" },
  { input: "4 Blue", expectedId: "3" },
  { input: "4Blue", expectedId: "3" },
  { input: "8b", expectedId: "4" },
  { input: "NonExistent", expectedId: null },
];

console.log("\n--- Testing findBestClassMatch ---");
matchingTestCases.forEach(({ input, expectedId }) => {
  const result = findBestClassMatch(input, classes);
  const passed = result?.id === expectedId || (result === null && expectedId === null);
  console.log(`${passed ? "✅" : "❌"} Input: "${input}", Expected ID: ${expectedId}, Result ID: ${result?.id || "null"} (${result?.name || "none"})`);
});

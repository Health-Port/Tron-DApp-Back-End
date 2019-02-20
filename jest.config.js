module.exports = {
    bail: false,
    // Automatically clear mock calls and instances between every test
    clearMocks: true,
    // The directory where Jest should output its coverage files
    coverageDirectory: './coverage',
    // An array of regexp pattern strings used to skip coverage collection
    coveragePathIgnorePatterns: ['/node_modules/', './test/'],
    // An array of file extensions your modules use
    moduleFileExtensions: ['js'],

    // A list of paths to directories that Jest should use to search for files in
    roots: ['<rootDir>'],
    // Allows you to use a custom runner instead of Jest's default test runner
    runner: 'jest-runner',

    // The paths to modules that run some code to configure or set up the testing environment before each test
    // setupFiles: [],

    // The path to a module that runs some code to configure or set up the testing framework before each test
    setupTestFrameworkScriptFile: '<rootDir>/scripts/setupTests.js',
    // The test environment that will be used for testing
    testEnvironment: 'node',
    // The glob patterns Jest uses to detect test files
    testMatch: ['**/test/**/*.test.+(js|ts|tsx)'],
    // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
    testPathIgnorePatterns: ['/node_modules/'],

    // Indicates whether each individual test should be reported during the run
    verbose: true,
}

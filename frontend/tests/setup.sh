#!/bin/bash

# Task Management System Test Setup
# This script sets up the testing environment

echo "🚀 Setting up Task Management System Test Environment"
echo "====================================================="

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run this from the project root."
    exit 1
fi

# Install testing dependencies
echo "📦 Installing testing dependencies..."
npm install --save-dev \
    @testing-library/react \
    @testing-library/jest-dom \
    @testing-library/user-event \
    jest \
    jest-environment-jsdom \
    @types/jest

# Create Jest configuration
echo "⚙️  Creating Jest configuration..."
cat > jest.config.js << 'EOF'
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  testMatch: [
    '<rootDir>/tests/**/*.test.(ts|tsx)'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  }
};
EOF

# Create setupTests.ts
echo "📝 Creating test setup file..."
cat > tests/setupTests.ts << 'EOF'
import '@testing-library/jest-dom';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.CustomEvent
(global as any).CustomEvent = class CustomEvent extends Event {
  detail: any;
  constructor(event: string, params?: any) {
    super(event, params);
    this.detail = params?.detail;
  }
};

// Mock fetch
global.fetch = jest.fn();

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
} as any;

// Suppress console errors during tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
EOF

# Create TypeScript configuration for tests
echo "🔧 Creating TypeScript configuration for tests..."
cat > tests/tsconfig.json << 'EOF'
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "types": ["jest", "@testing-library/jest-dom"]
  },
  "include": [
    "./**/*",
    "../src/**/*"
  ]
}
EOF

# Update package.json scripts
echo "📜 Updating package.json scripts..."
npm pkg set scripts.test="jest"
npm pkg set scripts.test:watch="jest --watch"
npm pkg set scripts.test:coverage="jest --coverage"
npm pkg set scripts.test:ci="jest --ci --coverage --watchAll=false"

# Create a simple test to verify setup
echo "🧪 Creating verification test..."
cat > tests/setup.test.ts << 'EOF'
import { render, screen } from '@testing-library/react';

describe('Test Environment Setup', () => {
  it('should have working test utilities', () => {
    expect(render).toBeDefined();
    expect(screen).toBeDefined();
  });

  it('should have jest-dom matchers', () => {
    const div = document.createElement('div');
    div.textContent = 'Hello World';
    document.body.appendChild(div);
    
    expect(div).toBeInTheDocument();
    expect(div).toHaveTextContent('Hello World');
    
    document.body.removeChild(div);
  });

  it('should have mocked fetch', () => {
    expect(global.fetch).toBeDefined();
    expect(global.fetch).toBe(jest.fn());
  });

  it('should have mocked CustomEvent', () => {
    const event = new CustomEvent('test', { detail: { data: 'test' } });
    expect(event.detail).toEqual({ data: 'test' });
  });
});
EOF

# Make test runner executable
chmod +x tests/run-tests.sh

# Run verification test
echo "🔍 Running verification test..."
npm test tests/setup.test.ts -- --passWithNoTests

if [ $? -eq 0 ]; then
    echo -e "\n✅ Test environment setup complete!"
    echo ""
    echo "Available commands:"
    echo "  npm test              # Run all tests"
    echo "  npm run test:watch    # Run tests in watch mode"
    echo "  npm run test:coverage # Run tests with coverage"
    echo "  ./tests/run-tests.sh  # Run comprehensive bug detection"
    echo ""
    echo "Next steps:"
    echo "1. Run comprehensive tests: ./tests/run-tests.sh"
    echo "2. Fix bugs identified in tests/task-management-bugs.md"
    echo "3. Re-run tests to verify fixes"
else
    echo -e "\n❌ Test setup failed. Please check the error messages above."
    exit 1
fi

echo ""
echo "🎉 Setup complete! Your testing environment is ready."
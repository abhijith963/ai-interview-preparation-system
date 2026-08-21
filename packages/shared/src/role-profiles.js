const category = (id, label, weight, skills) =>
  Object.freeze({ id, label, weight, skills: Object.freeze(skills) });

const role = (id, label, domain, summary, categories) =>
  Object.freeze({
    id,
    label,
    domain,
    summary,
    categories: Object.freeze(categories),
    version: '1.0.0',
  });

export const ROLE_PROFILES = Object.freeze([
  role(
    'software-engineer',
    'Software Engineer / Developer',
    'General Software Engineering',
    'Language-agnostic software fundamentals for entry-level engineering roles.',
    [
      category('programming-fundamentals', 'Programming Fundamentals', 0.2, [
        'control-flow',
        'functions',
        'data-types',
        'error-handling',
        'complexity-basics',
      ]),
      category('data-structures-algorithms', 'Data Structures and Algorithms', 0.25, [
        'arrays-strings',
        'linked-lists',
        'stacks-queues',
        'trees-graphs',
        'sorting-searching',
        'time-space-complexity',
      ]),
      category('object-oriented-design', 'OOP and Design', 0.15, [
        'encapsulation',
        'inheritance-composition',
        'polymorphism',
        'solid-basics',
      ]),
      category('computer-science-fundamentals', 'CS Fundamentals', 0.2, [
        'dbms',
        'operating-systems',
        'computer-networks',
      ]),
      category('engineering-practices', 'Engineering Practices', 0.2, [
        'git',
        'testing',
        'debugging',
        'code-quality',
        'problem-solving',
      ]),
    ],
  ),
  role(
    'frontend-developer',
    'Frontend Developer',
    'Web Frontend Development',
    'Browser-based interface development with React and core web technologies.',
    [
      category('web-foundations', 'Web Foundations', 0.2, [
        'semantic-html',
        'css-layout',
        'responsive-design',
        'web-accessibility',
      ]),
      category('javascript-typescript', 'JavaScript and TypeScript', 0.25, [
        'language-fundamentals',
        'async-javascript',
        'dom-events',
        'modules',
        'type-system-basics',
      ]),
      category('react', 'React', 0.25, [
        'components-props',
        'state-hooks',
        'effects',
        'forms',
        'routing',
      ]),
      category('browser-api-integration', 'Browser and API Integration', 0.15, [
        'http-fetch',
        'browser-rendering',
        'storage',
        'error-loading-states',
      ]),
      category('frontend-quality', 'Frontend Quality', 0.15, [
        'component-testing',
        'performance-basics',
        'maintainability',
        'user-experience-basics',
      ]),
    ],
  ),
  role(
    'backend-developer',
    'Backend Developer',
    'Web Backend and API Development',
    'Server-side application, API, and data-layer fundamentals.',
    [
      category('server-fundamentals', 'Server Fundamentals', 0.2, [
        'runtime-concurrency',
        'request-lifecycle',
        'configuration',
        'error-handling',
      ]),
      category('http-api-design', 'HTTP and API Design', 0.25, [
        'http-semantics',
        'rest',
        'validation',
        'status-errors',
        'api-versioning',
      ]),
      category('databases', 'Databases', 0.2, [
        'data-modeling',
        'queries-indexes',
        'transactions-consistency',
        'sql-nosql-tradeoffs',
      ]),
      category('backend-security', 'Authentication and Data Safety', 0.2, [
        'authentication',
        'authorization',
        'password-safety',
        'input-safety',
        'secrets',
      ]),
      category('backend-quality', 'Backend Quality', 0.15, [
        'unit-integration-testing',
        'logging-basics',
        'reliability',
        'scalability-basics',
      ]),
    ],
  ),
  role(
    'full-stack-developer',
    'Full-Stack Developer',
    'Full-Stack Web Development',
    'End-to-end web development across client, API, and database boundaries.',
    [
      category('full-stack-frontend', 'Frontend Fundamentals', 0.2, [
        'html-css',
        'javascript',
        'react',
        'responsive-ui',
      ]),
      category('full-stack-backend', 'Backend Fundamentals', 0.2, [
        'server-runtime',
        'http-rest',
        'validation',
        'error-handling',
      ]),
      category('full-stack-data', 'Data Layer', 0.15, [
        'data-modeling',
        'queries-indexes',
        'database-tradeoffs',
      ]),
      category('full-stack-integration', 'Integration and Security', 0.2, [
        'api-integration',
        'authentication-authorization',
        'state-data-flow',
        'input-safety',
      ]),
      category('full-stack-practices', 'Engineering Practices', 0.25, [
        'git',
        'testing',
        'debugging',
        'deployment-basics',
        'end-to-end-problem-solving',
      ]),
    ],
  ),
]);

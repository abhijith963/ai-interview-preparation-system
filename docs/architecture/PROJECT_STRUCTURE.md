# Final Project Structure

The repository is a small npm-workspaces monorepo. Phases 1–5 keep the frozen modular-monolith boundaries without adding microservices.

```text
ai interview/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── config/          # validated environment and MongoDB setup
│   │   │   ├── lib/             # external adapters such as OpenAI
│   │   │   ├── middleware/      # HTTP error, auth, upload, and validation middleware
│   │   │   ├── modules/         # feature modules added by their approved phase
│   │   │   │   ├── auth/        # Phase 2
│   │   │   │   ├── users/       # Phase 2
│   │   │   │   ├── resumes/     # Phase 2
│   │   │   │   ├── roles/       # Phase 2
│   │   │   │   ├── interviews/  # Phase 3
│   │   │   │   └── analytics/   # Phase 4
│   │   │   ├── routes/          # API route composition
│   │   │   ├── app.js           # Express application factory
│   │   │   └── server.js        # environment, DB, and HTTP startup
│   │   ├── test/
│   │   ├── .env.example
│   │   └── package.json
│   └── web/
│       ├── src/
│       │   ├── app/              # router and root application
│       │   ├── auth/             # session context and protected-route guard
│       │   ├── components/       # reusable presentation/layout components
│       │   ├── lib/              # credentialed browser API client
│       │   ├── pages/            # route-level pages
│       │   ├── styles/           # Tailwind entry and global tokens
│       │   └── test/             # browser-test setup
│       ├── .env.example
│       ├── index.html
│       ├── package.json
│       └── vite.config.js
├── packages/
│   └── shared/
│       ├── src/                  # frozen roles, states, routes, and algorithms
│       ├── test/
│       └── package.json
├── docs/
│   ├── architecture/             # structure, architecture, model, HTTP/AI contracts, state flow
│   ├── product/                  # role, algorithm, route, and user-flow definitions
│   ├── setup/                    # environment and external services
│   ├── PHASE_1_DECISIONS.md
│   ├── PHASE_3_DECISIONS.md
│   ├── PHASE_4_DECISIONS.md
│   ├── PROJECT_GUIDE.md
│   ├── TESTING.md
│   ├── DEPLOYMENT.md
│   └── KNOWN_LIMITATIONS.md
├── scripts/                     # opt-in real-provider QA harness
├── .editorconfig
├── .gitignore
├── .nvmrc
├── eslint.config.js
├── package.json
├── package-lock.json
├── README.md
└── IMPLEMENTATION_PLAN.md
```

## Module convention

Each backend feature module may contain `*.routes.js`, `*.controller.js`, `*.service.js`, `*.repository.js`, `*.model.js`, and `*.schema.js` only when needed. Small modules must not be split into empty layers for appearance.

Frontend route behavior stays in `pages` while it is small. Shared session behavior belongs in `auth`, generic requests in `lib`, generic UI in `components`, and approved cross-application constants in `packages/shared`. Feature folders should be introduced only when later-phase complexity warrants them.

# Startup Roast Arena Backend

A backend for **Startup Roast Arena**, a Saylani IT Training assignment.

The idea is simple: students submit a startup idea, three AI investors give different kinds of feedback, other students can support the idea with one vote, and the leaderboard ranks the current ideas.

This repository contains the **Node.js / Express backend only**. A React frontend can be connected later.

> **The AI gives opinions. The backend keeps the rules.**

---

## What this project does

A founder can:

- create an account and log in;
- submit a startup pitch with a title, problem, solution, customer, and roast level;
- receive feedback from three AI investor personalities;
- re-pitch an improved version later without losing the old version;
- compare the latest score with the previous score.

A community member can:

- browse submitted ideas and their AI reviews;
- vote once for an idea;
- view the leaderboard.

The backend makes sure that users cannot vote for their own idea or vote twice for the same idea.

---

## Main features

- JWT login and protected API routes
- Secure password hashing with bcrypt
- MongoDB storage through Mongoose
- Three AI investors: **Strict**, **Funny**, and **Dreamer**
- Real Groq AI support when API credentials are configured
- Clearly labelled mock AI mode for tests and local demos
- AI JSON validation, retries, safe fallback reviews, and fictional-offer limits
- One permanent community vote per user per idea
- AI + community-vote leaderboard
- Re-pitch history and score comparison
- Automated API and business-rule tests
- Postman collection for manual testing

---

## How a request moves through the project

```text
Route → Middleware → Controller → Service → Model → MongoDB
```

For example, when a user creates an idea:

```text
POST /api/ideas
  → routes/ideaRoutes.js
  → controllers/ideaController.js
  → services/aiService.js
  → Idea, Version, and Review models
  → MongoDB
```

The AI review service then calls Groq, validates its response, and stores only safe, valid data.

---

## Technologies used

| Technology | Why it is used |
|---|---|
| Node.js + Express | REST API server |
| MongoDB + Mongoose | Database and schemas |
| JWT + bcrypt | Authentication and password security |
| Zod | Request and AI response validation |
| Groq SDK | Live AI investor feedback |
| Helmet + CORS + rate limits | Basic API security |
| Vitest + Supertest | Automated tests |

---

## Project structure

```text
src/
├── config/       # MongoDB connection and project constants
├── models/       # Mongoose schemas and MongoDB indexes
├── routes/       # endpoint URLs
├── controllers/  # request handling and responses
├── middleware/   # JWT authentication and common errors
├── services/     # Groq AI logic and leaderboard formula
├── app.js        # Express configuration and route mounting
└── server.js     # server startup
```

For a detailed Roman Urdu explanation of every folder, API flow, viva questions, and practice tasks, read [STUDENT_GUIDE.md](STUDENT_GUIDE.md).

---

## Database collections

The backend uses five MongoDB collections:

| Collection | What it stores |
|---|---|
| `users` | Display name, email, and password hash |
| `ideas` | The main idea and its current version reference |
| `versions` | Each original pitch and every re-pitch |
| `reviews` | One AI review from each investor for each version |
| `votes` | A user's single support vote for an idea |

Important database rules:

- Email is unique.
- Each idea can have one version number only once.
- Each investor can review a pitch version only once.
- Each user can vote only once per idea, even after re-pitching.

---

## Before you start

Install:

- **Node.js 20 or later**
- A MongoDB Atlas database or local MongoDB
- A Groq API key if you want live AI feedback

---

## Installation

Clone the repository:

```bash
git clone https://github.com/UzairUmair/roast-arena-backend.git
```

Move into the project:

```bash
cd roast-arena-backend
```

Install packages:

```bash
npm install
```

Create a `.env` file by copying `.env.example`:

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```bash
Copy-Item .env.example .env
```

Then fill in `.env`:

```ini
NODE_ENV=development
PORT=4000
MONGODB_URI=
JWT_SECRET=
GROQ_API_KEY=
GROQ_MODEL=
FRONTEND_URL=http://localhost:5173
MOCK_AI=false
```

### Environment variables

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas or local connection string |
| `JWT_SECRET` | A long random secret used for JWT tokens |
| `GROQ_API_KEY` | Server-side Groq API key |
| `GROQ_MODEL` | A model currently available to your Groq account |
| `FRONTEND_URL` | Allowed frontend origin for CORS |
| `MOCK_AI` | `true` for mock responses, `false` for real Groq AI |

Never commit `.env`. It is already ignored by Git.

---

## MongoDB setup

1. Create a MongoDB Atlas cluster.
2. Create a database user.
3. Add your current IP address in **Network Access**.
4. Copy the connection string into `MONGODB_URI`.
5. Start the backend. Mongoose will create the collections and indexes when they are needed.

---

## Groq AI setup

1. Create a Groq API key.
2. Check which chat models are available to your account.
3. Put the key in `GROQ_API_KEY`.
4. Put an available model ID in `GROQ_MODEL`.
5. Set `MOCK_AI=false`.

The Groq key is used only on the backend. It must never go into a React `VITE_` variable or frontend code.

### Mock AI mode

For testing or a reliable classroom demo without using Groq, set:

```ini
MOCK_AI=true
```

Mock reviews are returned with:

```json
{ "source": "mock" }
```

This is useful for demos, but it should not be presented as a live AI result.

---

## Running the backend

Start in development mode:

```bash
npm run dev
```

Start normally:

```bash
npm start
```

After starting, test the health route:

```text
GET http://localhost:4000/api/health
```

---

## Authentication

Register or log in first. The backend returns a JWT token.

Send that token with protected requests:

```text
Authorization: Bearer <your-token>
```

Passwords are hashed with bcrypt and are never returned in API responses.

---

## API endpoints

Successful responses use this format:

```json
{ "success": true, "data": {} }
```

Errors use this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Readable error message"
  }
}
```

| Method | Endpoint | Login required? | What it does |
|---|---|---:|---|
| GET | `/api/health` | No | Checks if the API is running |
| POST | `/api/auth/register` | No | Creates a user account |
| POST | `/api/auth/login` | No | Logs in and returns a JWT |
| GET | `/api/auth/me` | Yes | Returns the current user |
| GET | `/api/ideas?page=1&limit=12` | No | Lists public ideas |
| POST | `/api/ideas` | Yes | Creates a pitch and gets three reviews |
| GET | `/api/ideas/mine` | Yes | Lists the logged-in founder's ideas |
| GET | `/api/ideas/:id` | Optional | Shows an idea, its reviews, votes, and score data |
| GET | `/api/ideas/:id/versions` | No | Shows old and new pitch versions |
| POST | `/api/ideas/:id/repitch` | Owner only | Creates a new pitch version |
| POST | `/api/ideas/:id/vote` | Yes | Casts one support vote |
| GET | `/api/leaderboard` | No | Shows ranked ideas |

### Example: create an idea

```json
{
  "title": "Smart Canteen",
  "problem": "Students wait in long canteen queues.",
  "solution": "An online food preorder system.",
  "customer": "School and university students.",
  "roastLevel": "medium"
}
```

Valid roast levels are:

```text
mild
medium
spicy
```

The title can be up to 80 characters. Each pitch field can be up to 600 characters.

---

## AI investors

Every pitch is reviewed by three personalities:

| Investor | What they focus on |
|---|---|
| **The Strict Investor** | Demand, pricing, cost, competition, and feasibility |
| **The Funny Investor** | A respectful joke plus one useful business point |
| **The Dreamer** | Bigger vision, growth, expansion, and practical next steps |

A valid AI review looks like this:

```json
{
  "score": 7,
  "roast": "The idea has potential, but the revenue plan needs work.",
  "tip": "Talk to ten target customers before building the full product.",
  "offer": {
    "amountLakh": 5,
    "equityPercent": 10
  }
}
```

The backend does not blindly trust AI output. It validates the JSON, score, text length, and fictional offer. If the AI returns invalid data, it retries up to three times. If it still fails, the API saves an `unscored` fallback review instead of inventing a score.

### Fictional offers only

All funding offers are for learning only. They are not real investment offers and they never affect the leaderboard.

The backend safely clamps offers using the investor score:

```text
Amount: 0.5 × score to 2.5 × score lakh
Equity: max(5, 25 - 2 × score) to (30 - 2 × score) percent
```

---

## Voting, re-pitching, and leaderboard rules

### Voting rules

- A user must be logged in to vote.
- A founder cannot vote for their own idea.
- A user can vote once per idea.
- A second or concurrent vote returns `409 VOTE_DUPLICATE`.
- Re-pitching does not allow existing voters to vote again.

### Re-pitch rules

- Only the idea owner can re-pitch.
- Every re-pitch creates a new version instead of overwriting the old one.
- Every new version gets new AI reviews.
- The response includes overall and investor-by-investor score changes.
- Existing votes stay attached to the same idea.

### Leaderboard formula

Only valid reviews from the **current pitch version** are used.

```text
aiAverage = mean(valid AI scores)
voteScore = 10 × votes / (votes + 5)

If votes = 0:
  finalScore = aiAverage

Otherwise:
  finalScore = 0.70 × aiAverage + 0.30 × voteScore
```

Ideas without a valid AI score are not ranked. Funding offers never change ranking.

---

## Testing

The tests use an in-memory MongoDB database and mock AI. You do not need Atlas or a Groq key to run them.

Run all tests:

```bash
npm test
```

Run syntax checks:

```bash
npm run lint
```

The tests cover:

- user registration, login, duplicate emails, and protected routes;
- pitch validation and idea persistence;
- three separate AI investors;
- invalid AI output, retries, fallback reviews, and offer clamping;
- self-vote, duplicate vote, and simultaneous duplicate vote requests;
- leaderboard calculations;
- re-pitch ownership, version history, score comparison, and vote preservation.

---

## Postman collection

Import [Startup-Roast-Arena.postman_collection.json](Startup-Roast-Arena.postman_collection.json) into Postman.

Set these collection variables:

```text
baseUrl = http://localhost:4000/api
token = <JWT received after login>
ideaId = <an idea ID>
```

---

## Connecting a React frontend later

A future React frontend can use:

```ini
VITE_API_BASE_URL=http://localhost:4000/api
```

It should:

- send the JWT as a Bearer token for protected requests;
- show review state honestly using `source` (`groq`, `mock`, or `fallback`);
- show review status (`done` or `unscored`);
- label every funding offer as **“Fictional offer — for learning only.”**

---

## Known limitations

- This is a student MVP, not a real investment platform.
- Live Groq responses depend on a valid API key, an available model, and provider quota.
- AI feedback can be subjective even with a clear prompt and validation rules.
- Pitch creation waits for the three investor reviews. A larger production app would likely use a durable queue, but that is intentionally outside this assignment's scope.
- CORS currently allows the configured `FRONTEND_URL`; add exact frontend deployment URLs when deploying.

---

## Assignment reminder

This project does not offer real funding, payments, or investment advice. It is built for students to practice presenting ideas, receiving constructive feedback, and improving their pitches.

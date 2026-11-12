# Startup Roast Arena — Student Learning Guide

Ye guide is backend ko **samajhne**, **present karne**, aur khud modify karne ke liye hai. Isay code ke saath read karo. Goal code yaad karna nahi, balke request ka flow samajhna hai.

> **Simple rule:** AI opinion deta hai, lekin backend rules enforce karta hai.

---

## 1. Project simple words mein

Startup Roast Arena students ke startup ideas ke liye feedback platform hai.

1. Founder register/login karta hai.
2. Founder apna idea submit karta hai: title, problem, solution, customer, aur roast level.
3. Teen AI investors feedback dete hain: Strict, Funny, aur Dreamer.
4. Doosre users idea ko ek dafa vote kar sakte hain.
5. Leaderboard AI score aur votes mila kar rank banata hai.
6. Founder idea improve karke re-pitch kar sakta hai. Old version delete nahi hota.

Ye **learning project** hai. Funding offers fictional hain; koi real investment ya payment nahi hoti.

---

## 2. Folder structure

```text
src/
├── config/
│   ├── db.js              # MongoDB connection
│   └── constants.js       # fixed project values
├── models/                # MongoDB schemas
├── controllers/           # req leta hai, logic chalata hai, res bhejta hai
├── routes/                # URL ko controller se connect karta hai
├── middleware/            # auth aur common errors
├── services/              # AI aur leaderboard formulas
├── app.js                 # Express app aur routes setup
└── server.js              # server start karta hai
```

### Har folder ka kaam

| Folder / file | Easy explanation |
|---|---|
| `config/db.js` | MongoDB Atlas se connection banata hai. |
| `models/` | Batata hai database mein document kaisa hoga. |
| `routes/` | URL aur HTTP method define karta hai. |
| `controllers/` | Request ka main kaam karta hai aur JSON response bhejta hai. |
| `middleware/` | Controller se pehle login/JWT check karta hai. |
| `services/aiService.js` | Groq ko prompt bhejta hai aur AI result validate karta hai. |
| `services/scoringService.js` | AI average aur leaderboard formula calculate karta hai. |
| `app.js` | Express, CORS, Helmet, JSON parser aur routes add karta hai. |
| `server.js` | `.env` load karta hai, MongoDB connect karta hai aur server run karta hai. |

---

## 3. Express server kaise start hota hai?

File: `src/server.js`

```text
1. dotenv .env variables load karta hai.
2. Server check karta hai ke MONGODB_URI aur JWT_SECRET hain ya nahi.
3. connectDB() MongoDB Atlas se connect hota hai.
4. app.listen() port 4000 par server start karta hai.
```

Important line ka concept:

```js
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
```

`app.listen()` Express server ko running state mein lata hai. Browser, Postman ya frontend phir is port par request bhej sakte hain.

---

## 4. MongoDB kaise connect hota hai?

File: `src/config/db.js`

```js
await mongoose.connect(process.env.MONGODB_URI);
```

`MONGODB_URI` `.env` file se aata hai. Ye Atlas database ka connection link hota hai.

Agar connection success ho to console mein:

```text
MongoDB connected
```

Agar fail ho to application `process.exit(1)` se ruk jati hai, kyun ke database ke baghair backend ka main kaam nahi ho sakta.

---

## 5. Mongoose models kyun hain?

Models database structure define karte hain. MongoDB document database hai, lekin Mongoose se validation, relationship aur indexes likhna easy ho jata hai.

### `User.js`

User ka naam, email aur `passwordHash` save hota hai.

- Plain password kabhi save nahi hota.
- `passwordHash` par `select: false` hai, is liye normal query mein password hash response mein nahi aata.
- Email par unique index hai.

### `Idea.js`

Idea ka main record hai:

- `ownerId`: idea kis user ne banaya
- `title`: idea ka title
- `currentVersionId`: latest pitch version ka ID
- `currentVersionNumber`: latest version number

### `Version.js`

Har original pitch aur re-pitch alag document hai.

- `problem`, `solution`, `customer`, `roastLevel`
- `versionNumber`: 1, 2, 3...
- `evaluationStatus`: pending, complete, partial, ya failed

**Idea aur Version separate kyun?**

Idea ki identity same rehti hai, lekin founder pitch improve karta hai. Is liye old pitch overwrite nahi karte. Version history save rehti hai.

### `Review.js`

Har version ke liye teen AI reviews save hotay hain.

- `investor`: strict, funny, dreamer
- `score`, `roast`, `tip`, `offer`
- `source`: `groq`, `mock`, ya `fallback`

Unique index `{ versionId, investor }` ensure karta hai ke ek investor same version ko do dafa save na kare.

### `Vote.js`

Vote alag collection mein hota hai:

- `userId`
- `ideaId`

Unique index `{ userId, ideaId }` ensure karta hai ke user ek hi idea ko ek dafa vote kare, re-pitch ke baad bhi.

---

## 6. Route se controller tak request flow

Example: user idea create karta hai.

```text
POST /api/ideas
        ↓
src/routes/ideaRoutes.js
        ↓
protect middleware
        ↓
createIdea controller
        ↓
Idea + Version + Review models
        ↓
MongoDB
```

`routes/ideaRoutes.js` mein:

```js
router.post('/', protect, createIdea);
```

Is ka matlab:

- `POST /api/ideas` request aaye;
- pehle `protect` JWT token check kare;
- token valid ho to `createIdea` controller run ho.

---

## 7. Register aur login kaise kaam karte hain?

File: `src/controllers/authController.js`

### Register flow

```text
POST /api/auth/register
        ↓
Check required fields
        ↓
Check duplicate email
        ↓
bcrypt.hash(password)
        ↓
User.create()
        ↓
JWT token return
```

Password hashing:

```js
const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
```

Is se original password database mein nahi jata.

JWT token:

```js
jwt.sign(
  { id: user._id.toString(), displayName: user.displayName },
  process.env.JWT_SECRET,
  { expiresIn: '8h' },
);
```

### Login flow

```text
POST /api/auth/login
        ↓
User.findOne(email)
        ↓
bcrypt.compare(password, savedPasswordHash)
        ↓
JWT token return
```

---

## 8. JWT middleware kaise kaam karta hai?

File: `src/middleware/authMiddleware.js`

Protected request mein frontend/Postman header send karta hai:

```text
Authorization: Bearer <token>
```

`protect` middleware:

1. Header check karta hai.
2. `Bearer` token nikalta hai.
3. `jwt.verify()` se token verify karta hai.
4. Valid user info `req.user` mein save karta hai.
5. `next()` se controller ko chalata hai.

Controller phir use kar sakta hai:

```js
req.user.id
```

Isi se pata chalta hai idea ka owner kaun hai aur vote kis user ne diya.

`optionalProtect` public idea detail ke liye hai. Is se login user ka `hasVoted` aur `isOwner` show ho sakta hai, lekin bina token wala user bhi idea dekh sakta hai.

---

## 9. Idea save kaise hota hai?

File: `src/controllers/ideaController.js`

### Create idea API

```text
POST /api/ideas
```

Request body:

```json
{
  "title": "Smart Canteen",
  "problem": "Students wait in long queues.",
  "solution": "Students can preorder food.",
  "customer": "University students and canteen owners.",
  "roastLevel": "medium"
}
```

Flow:

1. `validatePitch()` fields check karta hai.
2. `Idea.create()` main idea save karta hai.
3. `Version.create()` version 1 save karta hai.
4. `generateAllReviews()` teen AI reviews generate karta hai.
5. `Review.create()` teen reviews save karta hai.
6. Response mein idea, version aur reviews return hotay hain.

Roast level sirf tone change karta hai. Score rules same rehte hain.

---

## 10. Groq aur teen investors kaise kaam karte hain?

File: `src/services/aiService.js`

Teen investors:

| ID | Name | Focus |
|---|---|---|
| `strict` | The Strict Investor | Market, costs, pricing, competition, feasibility |
| `funny` | The Funny Investor | Respectful joke aur useful business point |
| `dreamer` | The Dreamer | Growth, vision, expansion, practical next step |

### Main AI functions

| Function | Kaam |
|---|---|
| `getGroqReview()` | Groq API ko real request bhejta hai |
| `getMockReview()` | `MOCK_AI=true` par sample result deta hai |
| `validateAIResponse()` | AI ke JSON aur required fields check karta hai |
| `fixOfferValues()` | Fictional offer limits mein value adjust karta hai |
| `generateInvestorReview()` | Ek investor ka result, retry aur fallback handle karta hai |
| `generateAllReviews()` | Strict, Funny, Dreamer ke reviews ek ek kar ke banata hai |

### Real AI vs Mock AI

```ini
MOCK_AI=false
```

Is mode mein real Groq API call hoti hai.

```ini
MOCK_AI=true
```

Is mode mein predictable sample reviews aate hain. Response mein `source: "mock"` hota hai. Isko live AI result nahi kehna chahiye.

### AI validation kyun zaroori hai?

AI external service hai. Wo wrong JSON, missing field, score 11, ya invalid offer bhej sakta hai.

Backend check karta hai:

- score integer 1 se 10 hai;
- roast aur tip empty nahi hain;
- offer values positive hain;
- data expected JSON format mein hai.

Agar invalid ho to backend maximum 3 attempts karta hai. Agar valid answer na mile to score invent nahi karta; `unscored` fallback save karta hai.

---

## 11. Vote kaise save hota hai?

Files:

- `src/routes/voteRoutes.js`
- `src/controllers/voteController.js`
- `src/models/Vote.js`

API:

```text
POST /api/ideas/:id/vote
```

Flow:

1. User token se `req.user.id` milta hai.
2. Backend idea find karta hai.
3. Check karta hai user owner to nahi.
4. `Vote.create({ userId, ideaId })` vote save karta hai.
5. MongoDB unique index duplicate vote ko reject karta hai.

Expected errors:

| Situation | Status | Code |
|---|---:|---|
| Login nahi | 401 | `AUTH_REQUIRED` |
| Idea nahi mila | 404 | `IDEA_NOT_FOUND` |
| Founder apne idea par vote kare | 403 | `SELF_VOTE_FORBIDDEN` |
| Same user dobara vote kare | 409 | `VOTE_DUPLICATE` |

---

## 12. Leaderboard kaise calculate hota hai?

Files:

- `src/controllers/leaderboardController.js`
- `src/services/scoringService.js`

API:

```text
GET /api/leaderboard
```

For each idea, backend current version ke reviews aur total votes fetch karta hai.

Formula:

```text
aiAverage = valid AI scores ka average
voteScore = 10 × votes / (votes + 5)

votes = 0 ho to:
finalScore = aiAverage

votes > 0 ho to:
finalScore = 0.70 × aiAverage + 0.30 × voteScore
```

Example:

```text
AI scores: 7, 8, 6
AI average: 7
Votes: 5
Vote score: 5
Final score: 6.4
```

Funding offer leaderboard mein include nahi hoti. Agar valid AI score hi nahi hai to idea rank nahi hota.

---

## 13. Re-pitch kaise kaam karta hai?

API:

```text
POST /api/ideas/:id/repitch
```

Founder updated `problem`, `solution`, `customer`, aur `roastLevel` bhejta hai.

Flow:

1. Backend check karta hai idea exists karta hai.
2. Backend check karta hai logged-in user owner hai.
3. Current version aur uske old reviews fetch hotay hain.
4. New `Version` create hota hai: version 2, 3, etc.
5. New AI reviews generate aur save hotay hain.
6. `Idea.currentVersionId` aur `currentVersionNumber` update hote hain.
7. Backend old aur new investor scores ka difference return karta hai.

Important: Old version delete nahi hota. Votes bhi same idea ke saath rehte hain.

---

## 14. Main APIs quick table

| Method | Endpoint | Body? | Controller | Database action | Why this method? |
|---|---|---|---|---|---|
| POST | `/api/auth/register` | name, email, password | `register` | `User.create()` | Naya user create karna hai |
| POST | `/api/auth/login` | email, password | `login` | `User.findOne()` | Login credentials verify karne hain |
| GET | `/api/auth/me` | No | `getMe` | `User.findById()` | Current logged-in user show karna hai |
| POST | `/api/ideas` | title + pitch fields | `createIdea` | `Idea.create()`, `Version.create()`, `Review.create()` | Naya startup pitch create karna hai |
| GET | `/api/ideas` | query optional | `getIdeas` | `Idea.find()` | Public ideas list karni hain |
| GET | `/api/ideas/mine` | No | `getMyIdeas` | `Idea.find()` | Founder ke apne ideas chahiye |
| GET | `/api/ideas/:id` | No | `getIdeaById` | `findById()`, `Review.find()` | One idea detail chahiye |
| GET | `/api/ideas/:id/versions` | No | `getIdeaVersions` | `Version.find()` | Old/new pitch history chahiye |
| POST | `/api/ideas/:id/repitch` | updated pitch fields | `repitchIdea` | `Version.create()`, `idea.save()` | New version create karna hai |
| POST | `/api/ideas/:id/vote` | No | `voteForIdea` | `Vote.create()` | One support vote save karna hai |
| GET | `/api/leaderboard` | No | `getLeaderboard` | `Idea.find()`, `Review.find()`, `Vote.countDocuments()` | Ranked ideas show karni hain |

---

## 15. Kaun se concepts class se hain?

Ye concepts aapki class ke concepts se directly related hain:

- Node modules: `import` / `export`
- `express()` aur `app.use()`
- `express.json()`
- `app.listen()`
- `req.body`, `req.params`, `req.query`
- GET aur POST APIs
- `res.status().json()`
- Mongoose schemas aur models
- `find()`, `findById()`, `findOne()`, `create()`
- `populate()`
- ObjectId references
- bcrypt password hash
- JWT token generation aur middleware
- protected routes
- `try/catch` aur `async/await`

---

## 16. Kaun se concepts thore new hain?

In cheezon ko extra practice se samajhna hoga, lekin project mein inhein remove nahi karna chahiye kyun ke ye useful safety/reliability rules hain:

| New concept | Simple reason |
|---|---|
| Mongoose compound unique index | Duplicate vote database level par rokta hai |
| `select: false` | Password hash response mein accidentally nahi aata |
| `optionalProtect` | Public route par logged-in state show karta hai |
| Groq JSON response | AI result ko code-friendly object banata hai |
| AI retry + fallback | Invalid AI result par fake score nahi banta |
| Offer clamping | AI fictional offer ko allowed limits mein rakhta hai |
| `countDocuments()` | Vote count nikalta hai |
| `process.env` | Secrets aur configuration `.env` se leta hai |
| CORS / Helmet / rate limit | API ki basic security improve karte hain |
| `mongodb-memory-server` | Tests real Atlas data ko touch kiye baghair chalata hai |

---

## 17. Viva questions and short answers

### Q1: Idea aur Version separate kyun hain?

**Answer:** Idea main identity hai. Version har new pitch attempt hai. Re-pitch mein old idea overwrite nahi hota, is liye history aur score comparison possible hota hai.

### Q2: Password plain text mein kyun save nahi kiya?

**Answer:** Security ke liye bcrypt hash save kiya. Database leak ho bhi jaye to plain password directly visible nahi hota.

### Q3: JWT token ka use kya hai?

**Answer:** Login ke baad JWT user identity carry karta hai. Protected route token verify karke pata karti hai request kis user ki hai.

### Q4: Vote model separate kyun hai?

**Answer:** Multiple users multiple ideas ko vote kar sakte hain. Vote collection user aur idea ka relationship save karti hai aur unique index duplicate vote rokta hai.

### Q5: AI output validate kyun karte ho?

**Answer:** AI galat format ya invalid score return kar sakta hai. Backend final rule enforcement karta hai.

### Q6: Mock AI mode kya hai?

**Answer:** Testing/demo mode jahan real Groq API call nahi hoti. Response `source: mock` ke saath aata hai.

### Q7: Re-pitch par second vote kyun nahi milta?

**Answer:** Assignment ka rule one vote per user per idea hai. Re-pitch same idea ka new version hai, new idea nahi.

### Q8: Leaderboard mein funding offer kyun use nahi hoti?

**Answer:** Offer fictional AI output hai. Ranking sirf valid AI score aur community votes se banti hai.

### Q9: `req.body` aur `req.params` ka difference?

**Answer:** `req.body` POST body data deta hai. `req.params` URL se dynamic value deta hai, jaise `/api/ideas/:id` mein `id`.

### Q10: `401`, `403`, aur `409` ka difference?

**Answer:** `401` login/token missing or invalid. `403` user logged in hai lekin permission nahi, jaise own idea vote. `409` duplicate/conflicting data, jaise second vote.

---

## 18. Five practice tasks — khud implement karo

In tasks ki solution abhi guide mein nahi di gayi. Pehle khud try karo, phir tests/Postman se check karo.

### Task 1: Add welcome route

**Goal:** `GET /api/welcome` route add karo jo `{ message: "Welcome to Startup Roast Arena" }` return kare.

- **Where:** `src/app.js`
- **Concept:** `app.get()`, `res.status().json()`
- **Test:** Browser/Postman mein `GET http://localhost:4000/api/welcome`

### Task 2: Add optional `tagline` to Idea

**Goal:** Founder optional one-line tagline add kar sake, maximum 120 characters.

- **Where:** `src/models/Idea.js`, `src/controllers/ideaController.js`
- **Concept:** optional Mongoose schema field, `req.body`
- **Test:** Create idea body mein `tagline` bhejo; detail response mein check karo.

### Task 3: Search ideas using `req.query`

**Goal:** `GET /api/ideas?search=canteen` sirf matching titles return kare.

- **Where:** `getIdeas` in `src/controllers/ideaController.js`
- **Concept:** `req.query.search`, MongoDB `{ title: /search/i }`
- **Test:** Different title ke two ideas create karke query run karo.

### Task 4: Improve one validation message

**Goal:** Customer field empty ho to message ko better banao: `Please tell us who will use this idea.`

- **Where:** `validatePitch` in `src/controllers/ideaController.js`
- **Concept:** if/else, arrays, validation
- **Test:** Missing customer ke saath POST `/api/ideas` call karo.

### Task 5: Add `GET /api/ideas/:id/vote-count`

**Goal:** Sirf vote count return karne wali route banao.

- **Where:** new function in `src/controllers/voteController.js`, route in `src/routes/voteRoutes.js`
- **Concept:** `req.params`, `Vote.countDocuments()`, GET route
- **Test:** Idea par vote karne ke baad endpoint call karo.

---

## 19. Run commands

Install dependencies:

```bash
npm install
```

Run server in development mode:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Run syntax check:

```bash
npm run lint
```

---

## 20. Final self-check before demo

1. `.env` mein MongoDB URI, JWT secret, Groq key/model check karo.
2. Real AI demo ke liye `MOCK_AI=false`; mock demo ke liye `MOCK_AI=true` aur sir ko clearly batana.
3. `npm run dev` chalao.
4. Postman se register/login karo.
5. Token ko Authorization Bearer header mein set karo.
6. Idea create karo aur review `source` dekho.
7. Second user se vote, duplicate vote aur self-vote rules demo karo.
8. Leaderboard aur re-pitch history dikhao.

Agar aap har step ka **reason** explain kar sakte hain, to aap code ko genuinely own karte hain.

# DECISIONS.md

## 1. AI Chat Context Management: Structured State vs. Full Chat History

**Choice:** We send a compact **structured state** (JSON of known facts, plus missing fields) together with only the last 4 messages, rather than re‑sending the entire conversation history.

**Alternatives considered:**
- Send the full chat log on every turn.
- Maintain a summarised conversation on the backend and feed only the summary.

**Why this choice:**
- Keeps token usage low (important for cost control).
- Prevents the model from “forgetting” early details, because the structured state is always accurate.
- Easier to debug – we can inspect the exact state being sent to the AI.
- In a production system with hundreds of users, token savings directly translate to lower operational costs.

## 2. Single “Beneficiaries” Table vs. Separate Tables for Each Role

**Choice:** All persons connected to a will (beneficiaries, executor, guardian, witnesses) are stored in one `beneficiaries` table with type/role flags.

**Alternatives considered:**
- Separate tables for `executors`, `guardians`, `witnesses`, and `beneficiaries`.
- A polymorphic association or JSON column.

**Why this choice:**
- Simplifies queries like “is a witness also a beneficiary?” – just a join on the same table.
- Reduces schema complexity while keeping data normalised.
- Adding new roles in the future only requires a new flag or type, not a new table.

## 3. Validation: On‑Demand Endpoint vs. Automatic on Every Update

**Choice:** Validation is exposed via a dedicated `GET /wills/:id/validate` endpoint that runs the checks on request, rather than running them automatically after each chat message.

**Alternatives considered:**
- Run validation inside the chat service after every update and store the result.
- Use database triggers.

**Why this choice:**
- Keeps the chat response fast – validation does multiple database aggregations.
- Allows the frontend to poll validation separately, only when needed (e.g., before showing download button).
- Three clear states (`incomplete`, `invalid`, `valid`) are returned, making the UI logic straightforward.

## 4. Mock AI Fallback for Development and Testing

**Choice:** The system first tries the real OpenAI API; if it fails (quota exceeded, network error), it falls back to a **rule‑based mock AI** that returns structured updates in the same format.

**Alternatives considered:**
- Use only the real API (development would stop when credits run out).
- Write a full offline interviewer without any real AI call.

**Why this choice:**
- Development and demo can continue without a paid API key.
- The mock demonstrates the exact same contract (conversational reply + JSON updates), so switching to the real AI is seamless.
- Shows the reviewer that we thought about fallback and resilience, which is important in production.

## 5. PDF Generation: Puppeteer with HTML Template vs. PDFKit

**Choice:** We use Puppeteer to render a styled HTML page and convert it to PDF.

**Alternatives considered:**
- PDFKit / jsPDF (pure JavaScript PDF construction).
- Use a third‑party service like DocRaptor.

**Why this choice:**
- Produces a pixel‑perfect, professional‑looking document with minimal code.
- Easy to iterate on the design using CSS.
- Puppeteer can be swapped out for a lighter solution in the future if performance becomes an issue.

## 6. Next.js App Router vs. Pages Router

**Choice:** We used the newer App Router (`app/` directory) with client components.

**Alternatives considered:**
- Pages Router (`pages/` directory).
- Plain React with Vite.

**Why this choice:**
- App Router is the current standard for Next.js and aligns with the assignment’s stack requirement.
- Gives us easy server‑side rendering for the landing page (though for this SPA‑like builder we used client components).
- The project is small enough that the learning curve was manageable within the timebox.
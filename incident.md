# INCIDENT.md

## Incident: AI “forgets” earlier answers and replies take 12+ seconds

### Symptoms
- Multiple users report that after about 10 minutes, the AI asks for information they already provided (e.g., “What is your name?” after they already gave it).
- The assistant’s replies are taking 12 seconds or more, when earlier they were under 3 seconds.

---

### Immediate response (on‑call actions)

1. **Check the backend logs** for `ChatService` errors. Look for `Failed to apply AI updates` or `OpenAI API error`. These will tell us if the AI returned malformed JSON or if the database writes are failing.

2. **Inspect the structured state** being sent to the AI. In `chat.service.ts`, the method `buildWillState` constructs the state. I would add temporary logging of the exact state object right before the OpenAI call to see if the facts are present. If the state is incomplete, the bug is in the state builder.

3. **Check the conversation history** that is loaded from `conversation_messages`. The service currently loads only the last 4 messages. If the user’s earlier answers were more than 4 messages ago, they might be missing from the prompt. I’d increase the `take` parameter temporarily or verify that the structured state alone is enough for the AI to remember everything (which it should be, because all facts are in the state).

4. **Monitor token usage and latency** for the recent requests. The OpenAI API might be taking longer if the prompt size has grown. I’d check the `max_tokens` and `temperature` settings; also, I’d see if the recent prompts accidentally included the whole chat history due to a code regression (e.g., someone changed the `recentMessages` logic).

5. **Test with a fresh will** to see if the problem is per‑user (corrupted data) or system‑wide. If only some wills are affected, inspect their database records for anomalies (e.g., beneficiaries with `will_id = null` that cause the builder to produce a broken state).

---

### Root cause hypothesis (based on our design)

After checking the logs and state, the likely cause is that **the structured state is not being updated correctly** after certain AI replies. For example, if the AI returns a malformed JSON block, the `extractJsonFromReply` method fails silently, the updates are not applied, and the state stays exactly as it was. The AI then sees the same missing fields, asks the same question again, and the chat length grows. The growing chat history (even though we only send the last 4, the whole conversation grows in the database) could also cause the AI to take longer because the *real* OpenAI call, if it were enabled, would still receive the full `messages` array, including all past messages, if the mock fallback was inadvertently removed. However, in our current design we only send 4 messages, so latency would not increase; 12 seconds suggests the OpenAI API is either under heavy load or we are sending a much larger prompt. I would check if `recentMessages` accidentally loads *all* messages (if `take` is missing or very large).

---

### Fix plan

1. **If the state is stale:** add error handling around `applyUpdates` to ensure a partial update doesn’t leave the will in a broken state. If a JSON parsing error occurs, log the full AI reply and return an error to the frontend, prompting a retry or a fallback question. Also, consider adding a retry mechanism for the AI call (if it’s a transient error).

2. **If the prompt is too large:** enforce a strict limit on the number of messages sent (e.g., always take the last 4) and also limit the token count of the structured state (it’s already small). Set a max tokens for the completion to 800.

3. **After deploying the fix:** flush the conversation history for the affected users (or ask them to start a new will) and monitor the logs for the next hour.

4. **Long‑term:** add a monitoring dashboard that tracks average response time and token usage per request. Set alerts when latency exceeds 5 seconds or when the AI asks the same question three times in a row (indicating a loop).

---

### How our design helped

- Because we use a **dedicated structured state**, we can easily validate its correctness by inspecting the database.  
- The **mock fallback** allows us to test the whole flow without a live API, making it easier to reproduce the “forgetting” bug in a dev environment.  
- **Validation on demand** means the system doesn’t waste resources checking completeness after every message, which could compound latency issues.
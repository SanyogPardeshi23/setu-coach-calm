# SETU Crowd Insights

Build the complete FRONTEND ONLY for my Smart India Hackathon project called:

SETU — Surge Evaluation & Transit Utility

IMPORTANT

I am responsible only for the FRONTEND.

Do NOT build:

- FastAPI backend

- PostgreSQL database

- Supabase

- YOLO

- OpenCV

- LSTM

- Machine learning models

- Real railway APIs

- Real-time railway data integrations

Use realistic MOCK/DEMO DATA in the frontend so the entire UI is clickable

and demonstrable. The frontend must be designed so a real backend/API can

be connected later without redesigning the UI — keep all logic in

separate, clearly named utility/service files (see FRONTEND LOGIC section

below), mirroring names a future backend would use.

---

PROJECT PURPOSE

SETU helps local/suburban train passengers understand crowd levels before

boarding. Passengers cannot easily know: how crowded the current train is,

which coach has less crowd, whether to board now, wait for the next train,

or move to another coach.

SETU provides:

1. Coach-wise crowd information

2. Crowd reporting by passengers (crowdsourced, train-agnostic — not tied

   to a ticket)

3. Crowd visualization

4. Time-decay-weighted crowd aggregation (recent reports matter far more

   than old ones)

5. Trust-weighted reporting (consistently accurate reporters carry more

   influence over time)

6. Actionable recommendation: BOARD NOW / WAIT FOR NEXT TRAIN / MOVE TO

   COACH X — computed by rule-based logic, not guessed

---

TECHNOLOGY

- React

- TypeScript

- Tailwind CSS

- Modern component architecture

- Responsive design

- Lucide icons

- Recharts for charts

Use frontend mock data/state only. Keep all mock data in a separate

file/service so it can later be replaced with real API calls.

---

DESIGN STYLE

Modern, clean, minimal, premium, mobile-first transportation-tech UI.

Should look like a serious SIH prototype, not a generic admin dashboard.

- Large touch-friendly buttons, rounded cards, subtle shadows, clear

  typography, smooth but minimal animations

- Crowd status colors: 🟢 Empty/Low  🟡 Comfortable/Moderate  🟠 Crowded/High

  🔴 Packed/Very High

- Professional blue/indigo accent for SETU actions

- Avoid excessive gradients or glassmorphism

---

RESPONSIVE REQUIREMENT

Passenger interface: mobile-first, works on phone/tablet/laptop/desktop.

Admin dashboard: desktop/tablet-first.

---

APPLICATION ROUTES

/          → Passenger Home

/report    → Report Crowd

/train     → Train Crowd Details

/history   → Report History

/admin     → Admin Dashboard

(Keep all existing screen-by-screen UI specs — Passenger Home, Report

Crowd, Train Crowd Details, Report History, Admin Dashboard, navigation,

component list, and empty states — exactly as previously detailed. Only

the FRONTEND LOGIC below changes.)

---

FRONTEND LOGIC — this is the part that must be exact, not approximate

**1. Crowd Level Scale**

Four discrete levels, each with a numeric value used in all calculations:

  EMPTY = 0        (display: "Low", plenty of space)

  COMFORTABLE = 1  (display: "Moderate", comfortably occupied)

  CROWDED = 2      (display: "High", difficult to move)

  PACKED = 3       (display: "Very High", extremely crowded)

Normalize to a 0–1 occupancy score by dividing by 3 (so Empty=0%,

Comfortable=33%, Crowded=67%, Packed=100%). Display as a percentage.

**2. Time-Decay Weighted Aggregation** (this replaces any vague

"simple time-decay concept")

Every crowd report has: coachId, level, timestamp, userId, userTrustScore

(default 1.0).

For a given coach, combine all its reports into one live score:

  weight(report) = e^(-decayRate * secondsSinceReport) * userTrustScore

  decayRate = ln(2) / 180        // 180-second half-life — a report is

                                  // worth half as much after 3 minutes

  occupancyScore = weightedAverage(all reports' normalized level scores,

                                     using each report's weight)

If a coach's total weight across all its reports drops below 0.05 (all

reports have effectively decayed), show that coach as "No Recent Data"

instead of trusting stale reports as if they were current. Distinguish

this from "No Data" (zero reports ever submitted for that coach) — these

are two different empty states in the UI.

Show a live confidence value per coach:

  confidence = min(1, totalWeight / numReports) * min(1, numReports / 3)

Use this to visually de-emphasize (e.g. lighter color, "low confidence"

tag) coaches with very few or very old reports.

**3. Trust Engine** (simulated — this is what powers "Trust Score" in

History and makes reports carry different weight)

Each simulated user has a trust score, starting at 1.0 (neutral), bounded

between 0.5 (minimum) and 1.5 (maximum).

In Admin Dashboard's Demo Simulation mode, periodically generate simulated

"verification events": a simulated user's past report is compared against

a simulated "actual" crowd level. Update their score:

  error = |reportedLevel - actualLevel| / 3        // 0 = perfect, 1 = worst

  accuracy = 1 - error

  target = 0.5 + accuracy * (1.5 - 0.5)

  newScore = currentScore + 0.05 * (target - currentScore)

  clamp newScore between 0.5 and 1.5

When a user submits a new crowd report, use their current trust score as

that report's userTrustScore in the aggregation formula above — so two

identical reports from different users can carry different real weight.

Label this clearly as "simulated verification" — never imply this is

backed by live staff checkpoints in this frontend-only build.

**4. Recommendation Engine** (rule-based, checked in this exact priority

order — not the vague "under 50 / 50-75 / over 75" bucket logic)

Constants:

  BOARD_NOW_MAX_OCCUPANCY = 0.70   // 70%

  COACH_IMBALANCE_MIN_GAP = 0.15   // 15 percentage points

  WAIT_MIN_IMPROVEMENT = 0.15      // next train must be 15pts better

  WAIT_MAX_ETA_MINUTES = 6

Given the current train's average occupancy across all coaches with live

data, and a list of upcoming trains (each with an ETA and a predicted

occupancy from mock/demo data):

  Step 1 — Check WAIT:

    IF avgOccupancy > BOARD_NOW_MAX_OCCUPANCY

    AND an upcoming train exists with etaMinutes <= 6

        AND (avgOccupancy - thatTrain.predictedOccupancy) >= 0.15

    THEN recommend: "WAIT — Train <id> in <n> min is less crowded

         (<X>% vs <Y>% now)"

    (If multiple qualifying trains exist, pick the least crowded one;

     break ties by soonest arrival.)

  Step 2 — else check MOVE_COACH:

    Find the coach with the lowest occupancy score on the current train.

    IF (commuter's current/selected coach score - bestCoach score) >= 0.15

       AND bestCoach is not the commuter's current coach

    THEN recommend: "Move to Coach <X> — more space (<label> vs <label>

         in your coach)"

  Step 3 — else default:

    Recommend: "Board Now — average occupancy <X>%"

Show the recommendation prominently with the exact reasoning text above,

not just a bare label — the "why" matters as much as the action.

**5. Points / Gamification**

Flat +10 SETU Points per submitted report (simple demo mechanic, not tied

to trust score). Display running total in History.

---

DEMO SIMULATION (Admin Dashboard)

When simulation is running, on each tick: generate a few new mock crowd

reports with current timestamps, run a few simulated trust-verification

events, recompute every coach's live occupancy score using the EXACT

decay formula above (don't fake random percentage jumps — actually run

the calculation), recompute the recommendation using the EXACT priority

logic above, and update the UI accordingly. This is the frontend visibly

proving the real algorithm works, not just animating random numbers.

---

MOCK DATA / UTILITY FILE ARCHITECTURE

Keep logic in separate, clearly named files so a real backend can drop in

later without touching UI components:

  /src/engine/decayWeightedEngine.ts   — Section 2 logic

  /src/engine/trustEngine.ts           — Section 3 logic

  /src/engine/recommendationEngine.ts  — Section 4 logic

  /src/data/mockData.ts                — stations, trains, seeded reports

---

IMPORTANT UI DETAILS

Always show "Demo Data" / "Prototype" / "Simulated Verification" where

appropriate. Do NOT claim live railway data, actual passenger counts,

real-time train tracking, or actual ML prediction — this is a rule-based

system with simulated data, and the UI must say so honestly.

---

FINAL GOAL

The frontend must let me demonstrate the full journey: select station →

select train → see current crowd → see coach-wise crowd → see the exact

rule-based recommendation with its reasoning → report crowd → see report

reflected in live scores → see it in History → open Admin Dashboard →

run Demo Simulation → watch the REAL decay/trust/recommendation formulas

visibly update the UI in real time.

The single question the frontend must answer, using the real logic above:

"Should I board this train, wait for the next one, or move to another

coach — and why?"

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://setu-coach-calm.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/25cd003d-4a88-4533-b75a-bbf8ec13cf48).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

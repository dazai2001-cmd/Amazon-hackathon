# Chapter One — The First Oath

First playable chapter, draft 1 · 10 October 2026

This is the narrative and interaction script for Chapter One. The Earned Valor prototype now runs its story path in an explorable 3D courtyard: the opening memory, arrival dialogue and motive choices, royal summons, three interactive weapon lessons, Mara's first-person trial and win/loss dialogue, forge conversation and shop, Orders discussion, full letter reveal and closing choice. Dialogue is staged in the world with five prerecorded synthetic cast voices, captions, original music, ambience and effects. Quest checkpoints retain story progress; choices also have later callbacks. Alden’s anytime training hall implements calibrated bodyweight routines and exercise-driven story stats. Integrating the circuit into the required chapter sequence remains planned; the normal-play estimate below includes that future scene.

## Chapter at a glance

**Normal play:** approximately 12–18 minutes, depending on exercise targets, camera setup, and duel retries.

**Player journey:** arrive at the courtyard → meet the instructor → complete a chosen training circuit → learn sword, shield, and evasion → face Mara → spend your first coins → discover the Orders board → receive the royal summons and its warning.

**Chapter question:** Can you trust the person teaching you to protect others?

**Working cast**

- **You:** an adult beginner. Player name is optional; dialogue uses “you.” Player responses appear as choices and need no recorded voice.
- **Sir Alden Vale:** the instructor. A disgraced veteran of the Order of the Ashen Gate. Dry, patient, precise. He answers practical questions readily and personal ones reluctantly.
- **Mara Venn:** the first rival, a duelist from the Order of the Red Hearth. Competitive and observant; she respects effort and dislikes excuses.
- **Tomas:** the village blacksmith. Warm, practical, and unimpressed by titles. Voice or captions over the workshop background; no new portrait required.
- **The herald / remembered voice:** brief off-screen lines, each with a distinct generated voice and captions in the current build.

Use the existing squire, instructor, and rival artwork, courtyard, arena, blacksmith, and six item icons. Letters and noticeboards can use ordinary rendered text. No additional character artwork is required for this draft.

## Scene 01 — A closed gate

**Presentation:** black screen. Rain. A distant horn. Wood strains against an iron gate. This is a memory, not a playable battle.

**REMEMBERED VOICE:** “Alden! There are still people inside!”

One beat of silence.

**ALDEN:** “Close the gate.”

The gate falls shut. Cut the sound sharply.

Title appears: **The First Oath.**

Fade into the morning courtyard. Alden stands beside an unused training post. His hand rests on his sheathed sword. When he sees you watching, he removes it.

**ALDEN:** “You’re early.”

**PLAYER CHOICE**

- “You said dawn.”
- “I couldn’t sleep.”
- “I heard you still train squires.”

**ALDEN — if dawn:** “Then you’ve already learned to listen. Come in.”

**ALDEN — if sleepless:** “A busy head needs something useful to do. Come in.”

**ALDEN — if squires:** “People say many things about this yard. You may judge this one for yourself.”

**ALDEN:** “What brought you here?”

**PLAYER CHOICE — remember this motive**

- **Coin:** “The tournament purse. I need a living.”
- **Belonging:** “I want an order that would take me.”
- **Truth:** “People call you a traitor. I want to know why.”

**ALDEN — coin:** “A practical answer. Let’s see that you live long enough to spend it.”

**ALDEN — belonging:** “Choose the people beside you carefully. Their promises will become your work.”

**ALDEN — truth:** “That answer will cost you more than the first two.”

He offers a worn iron sword and a plain round shield.

**ALDEN:** “For today, these are yours. Put the shield on your left. The sword goes in your right.”

**ON SCREEN:** Iron sword acquired. Oak shield acquired. Gambeson equipped.

**ALDEN:** “Your first task is to learn what you can control.”

**TRANSITION:** show the player’s three starting stats: Strength, Agility, Endurance. Each begins at level 1. These are game attributes.

## Scene 02 — A summons at the wall

A horn sounds beyond the courtyard. A proclamation appears over the scene; the herald is off-screen.

**HERALD:** “By command of King Orren: the Crown Tournament shall name the protector of his heir. Candidates must bear the seals of the Five Masters. The lists are open to orders and independent champions.”

Alden reads the notice without moving.

**YOU — choice:** “Does that include your order?”

**ALDEN:** “There is no order left to send me. And the Crown struck my name from the lists.”

**YOU — choice:** “Then we could make another.”

**ALDEN:** “A banner is easy to make. We’ll begin with the person beneath it.”

Mara arrives, carrying a folded paper.

**MARA:** “The king is dying, Alden. His messengers are already on the road. If your student intends to earn five seals, you should let them leave this yard eventually.”

**ALDEN:** “After they can keep a shield up.”

**MARA:** “Then I’ll be in the lists. Bring them before sunset.”

She sets the folded paper beside Alden. He turns it face down.

**ALDEN:** “We have time for a first lesson.”

**OBJECTIVE:** Prepare for Mara’s trial.

## Scene 03 — The first circuit

**INTERACTION:** the player chooses an exercise variation and a manageable target before each block. Suggested game presets are 3, 5, or 8 repetitions; the player may lower the target. Marching or jogging uses a selected time target, initially 15, 30, or 45 seconds. These are configurable game options, not a prescribed workout.

Standing calibration and floor/side-view calibration are separate. Reuse a camera setup while it remains valid. Instructions to reposition the phone appear before counting starts.

### Block A — Legs: squats

**ALDEN:** “A shield can stop a blade. Your feet must still carry you out of its way.”

**ON SCREEN:** Choose a comfortable-range squat or a slower controlled variation. Choose your repetition target.

**ALDEN:** “Show me one slow movement first. We’ll use a range you can repeat comfortably.”

**CALIBRATION:** capture the player’s start and comfortable lower positions. Do not score this demonstration as a repetition.

**ALDEN:** “Ready. Lower, then return to your starting position.”

During the set, use the exercise cue bank below. A full, tracked lower-and-return cycle earns one repetition. Do not demand a universal squat depth.

**ALDEN — completion:** “Good. Remember that control when someone asks you to hurry.”

**ON SCREEN:** Agility 1 → 2. Evasion recovery improved.

### Block B — Arms: push-ups

**ALDEN:** “Your sword will feel heavier near the end of a duel. We’ll prepare for that now.”

**ON SCREEN:** Choose wall, knee-supported, or standard push-ups. Choose your repetition target.

**ALDEN:** “Choose the variation you can manage today.”

**SETUP:** show the camera placement appropriate to the selected variation. Relevant shoulders, elbows, wrists, hips, and supporting joints must be visible. Begin only after that exercise’s calibration succeeds.

**ALDEN:** “One slow repetition for the view. Then we’ll begin your set.”

**CALIBRATION:** establish a comfortable starting and lowered position for this variation. Keep this separate from the standing torso calibration.

**ALDEN:** “Lower, return, and let me see you reset.”

**ALDEN — completion:** “Enough for this lesson. You have a steadier foundation to work from.”

**ON SCREEN:** Strength 1 → 2. Basic strike power improved.

### Block C — Breath: marching or jogging in place

**ALDEN:** “A duel lasts longer than its first exchange.”

**ON SCREEN:** Choose marching or jogging in place. Choose your time target.

**ALDEN:** “Stay in your space. Find a pace you can maintain.”

**INTERACTION:** count time only while the selected movement is confidently tracked. Pause the timer for tracking loss, inactivity, or a player pause. This task uses movement in place; it does not require travelling around the room.

**ALDEN — halfway:** “Keep your pace.”

**ALDEN — final five seconds:** “Five seconds remain.”

**ALDEN — completion:** “Now you know the pace you can return to.”

**ON SCREEN:** Endurance 1 → 2. Maximum stamina improved.

### End of circuit

**ALDEN:** “Those three lessons will stay with you: a measured strike, a sure recovery, and enough breath for another exchange.”

Use that line when all three blocks are completed. Otherwise:

**ALDEN — partial circuit:** “Keep what you’ve learned today. There’s time for the rest.”

**IF A BLOCK IS DECLINED OR UNTRACKABLE:** allow the player to rest, change the variation, retry camera setup, or continue. An unfinished block gives no stat reward; it does not prevent the story from advancing.

**ALDEN — continue without a block:** “We can return to that lesson. Let’s work with what you have today.”

**REWARD RULE:** each completed block grants its chapter stat improvement once. Repeating the circuit is practice; it cannot repeatedly farm these first-lesson upgrades. In later chapters, variation and target choices can feed bounded training progression.

## Scene 04 — The space behind a shield

**Presentation:** courtyard. Alden’s portrait and short demonstrations. The player uses empty-hand gestures to control virtual equipment.

**ALDEN:** “Raise your shield. Your left hand places it. Hold your guard.”

**OBJECTIVE:** hold the calibrated shield gesture until the virtual guard is established.

**ALDEN — guard succeeds:** “There. Keep the opening above the shield in mind.”

**ALDEN:** “Your blade follows your wrist and forearm. Make one measured cut, then recover.”

**OBJECTIVE:** perform one recognised sword gesture. A stationary wrist or an untracked movement does not count.

**ALDEN — cut succeeds:** “A clear movement. Let the blade recover before the next.”

**ALDEN:** “Finally, shift into the space beside you.”

**OBJECTIVE:** perform a calibrated left or right evasion. Use the player’s comfortable range.

**ALDEN — evasion succeeds:** “A small opening is often enough.”

**ALDEN:** “Guard spends stamina. Striking spends stamina. Lower your guard between exchanges and give yourself time to recover.”

Mara calls from the gate.

**MARA:** “Will you explain every duel before allowing one?”

**ALDEN:** “Only their first.”

**MARA:** “Then bring your squire.”

## Scene 05 — Earn the opening

**Presentation:** tournament arena. Alden watches from the edge. Mara is the named story opponent, controlled by the game. This sparring trial is separate from live multiplayer.

**MARA:** “We fight until one of us yields. The blades are blunted for the lists. Read my guard, protect your line, and watch your stamina.”

**YOU — choice**

- “I’ve never fought in an arena.”
- “I’m ready.”
- “What happens if I lose?”

**MARA — first arena:** “Then you’ll remember this one.”

**MARA — ready:** “We’ll find out.”

**MARA — losing:** “You learn where your guard failed. Then you choose whether to try again.”

**ALDEN:** “Watch her shoulders. She’ll show you where the next strike begins.”

**INTERACTION:** the duel starts on the player’s Ready action. Both fighters begin with 100 health and fresh stamina. Health reaching zero ends the sparring trial with a yield. The player’s wrist and forearm place and orient the sword; the other wrist places the shield. A validated sword-tip sweep must cross an opponent hit area within weapon reach to deal damage. Three strikes cannot defeat a fresh opponent. The three situations below introduce Mara’s attack lines; subsequent exchanges combine them.

### First exchange — Guard and answer

Mara lifts her sword into an obvious high preparation.

**ALDEN — first occurrence only:** “Cover the high line.”

Mara attacks after a readable wind-up.

**ON SUCCESSFUL BLOCK — ALDEN:** “Now answer.”

Mara has a short recovery opening. A recognised strike can damage her health. A shield moved into the attack line shortly before contact earns a perfect block and a stronger riposte; holding the shield drains stamina.

**ON THE PLAYER’S FIRST TOUCH — MARA:** “There you are.”

**ON A MISSED BLOCK — MARA:** “You saw it. Your guard arrived late.”

### Second exchange — Cover the left

Mara prepares a broad horizontal cut. Her shoulders turn before the attack.

**ALDEN — first occurrence only:** “Her blade comes from the left.”

**ON SUCCESSFUL EVASION — ALDEN:** “There’s your opening.”

**ON A MISSED EVASION — MARA:** “Watch the preparation. The blade moves after it.”

### Third exchange — Cover the right

**ALDEN — first occurrence only:** “Cover the right, or move aside.”

Mara prepares a right-side attack. Covering a different line does not stop it. A late lean can evade after she commits; a lean held throughout preparation can be retargeted. Between attacks she covers a high, left or right line. Cutting into that line is parried and spends stamina; changing cut direction can beat it. Repeated parries also wear down her guard.

**ALDEN — if the player repeatedly attacks the guard:** “Lower your guard for a moment. Recover.”

Mara eventually begins her next attack. The player must defend or evade and use the recovery window.

**MARA — if the player waits and counters:** “Better. You made me commit.”

### Remaining exchanges

Keep attack preparations readable. Do not turn the first trial into a speed test. Voice guidance becomes less frequent after the player has demonstrated the action; cues must not overlap.

**ALDEN — low stamina, once per low-stamina episode:** “Make room. Let your stamina return.”

**ALDEN — tracking loss:** “Hold. We’ll continue when I can see you.”

For this story duel, pause both fighters on tracking loss. Require an explicit resume after a sustained interruption.

### Victory

Mara lowers her sword.

**MARA:** “Enough. I yield. Your trial.”

**ALDEN:** “That was your first trial. Remember what worked.”

**MARA:** “You may enjoy that compliment. He rarely gives them.”

**ON SCREEN:** First trial won. Twenty coins earned.

**MARA:** “Ilyra Dane keeps the first master’s seal at Ironbridge. Tell her I sent you. She’ll still make you earn it.”

### Defeat

Mara stops immediately when the player’s health reaches zero.

**MARA:** “Enough. You yield. My trial.”

**ALDEN:** “Take a moment. Then we’ll look at the exchange that cost you.”

**MARA:** “You can try me again before we leave.”

**PLAYER CHOICE**

- **Rematch:** replay the trial after a rest and Ready action.
- **Practice:** return to the short guard/strike/evasion lesson.
- **Continue the journey:** proceed without victory coins.

**MARA — continuing:** “At Ironbridge, ask for Ilyra Dane. Tell her you still have work to do. She’ll appreciate an honest introduction.”

The chapter can continue after defeat. The first victory reward remains available if the player later returns and wins; it can be claimed only once.

### Motive callback, after either outcome

**MARA — coin motive:** “The road has purses larger than this one. Keep enough coin to reach them.”

**MARA — belonging motive:** “You kept coming back into the exchange. An order can use someone who does that.”

**MARA — truth motive:** “You ask direct questions. Keep that habit when you reach the masters.”

## Scene 06 — Tomas’s counter

**Presentation:** blacksmith workshop. The existing backdrop, coin icon, and item images carry this scene. Tomas speaks off-screen.

**TOMAS:** “Alden’s new squire. I wondered who’d be leaving my door with that shield.”

**YOU — choice:** “You made it?”

**TOMAS:** “I’ve repaired it often enough to claim some credit.”

Alden places a small purse on the counter.

**ALDEN:** “Twenty coins for the road.”

**YOU — choice:** “A loan?”

**ALDEN:** “An investment. Spend it with thought.”

**ON SCREEN:** Travel purse received: twenty coins.

The player now has forty coins after a first victory, or twenty after continuing from defeat. The travel purse is a one-time chapter grant.

**TOMAS:** “Your kit will get you to Ironbridge. If you want an upgrade, choose what you expect to need.”

**SHOP CHOICES**

| Item | Price | Effect for this draft | Tradeoff |
| --- | --- | --- | --- |
| Balanced steel sword | 30 coins | More strike damage in later combat | Higher stamina cost per attack |
| Reinforced heater shield | 30 coins | Broader guard coverage | Slower stamina recovery while raised |
| Keep the starter kit | Free | Retain current equipment | Save coins for the journey |

These are proposed equipment rules. They do not change the result of a trial already completed.

**TOMAS — selecting the sword:** “A good edge. Remember what it asks of your arm.”

**TOMAS — selecting the shield:** “More cover. Remember what it weighs.”

**TOMAS — keeping the kit:** “A sensible traveller knows what they can afford.”

**IF THE PLAYER LACKS COINS:** show the actual price and balance. Permit a return to Mara’s trial or continuation with the starter kit.

**TOMAS — insufficient coins:** “Keep your purse. Your present kit still has work in it.”

The shop remains optional. Do not make story progress depend on a purchase.

## Scene 07 — A name beside yours

**Presentation:** arena background with an Orders noticeboard rendered as text. Mara returns.

**MARA:** “The Crown Tournament takes individual champions. The road belongs to orders.”

**YOU — choice:** “And if I travel alone?”

**MARA:** “You may. You’ll still need the five seals.”

She points to the board.

**MARA:** “When you have companions, put a name to your order. Challenge another. Three fighters from each side; each has a duel. Your victories belong to the people beside you as well.”

**ALDEN:** “An order begins when someone else can depend on you.”

**ON SCREEN:** Knightly Orders introduced.

**PLAYER CHOICE**

- **Found an order:** open the create-order flow, if available.
- **Join companions:** open join-by-code or the implemented roster flow, if available.
- **Travel alone for now:** continue immediately.

**MARA — founded/joined:** “I’ll remember your banner when it reaches the lists.”

**MARA — travelling alone:** “Then I’ll remember your name.”

**MULTIPLAYER CONTENT RULE:** an order challenge consists of paired, live player-versus-player duels. Display real participants, readiness, and the shared result. Do not represent the scripted Mara encounter as an online player.

If the multiplayer service is not included in the chapter build, retain Mara’s introduction and a read-only board. Creation, joining, and live-match buttons appear only when those actions actually work. “Travel alone” always advances the story.

## Scene 08 — The letter

**Presentation:** return to the courtyard at the end of the day. Reuse the background with a subtle scene tint if needed; no new sunset artwork is required.

Mara hands you the folded paper Alden left face down that morning.

**MARA:** “This came with the proclamation. It was addressed to the next person he trained.”

The outer letter is a royal tournament summons. Beneath it is a personal note.

**ON SCREEN — THE NOTE**

“To Alden Vale’s new squire,

If he teaches you to hold a shield, ask him who stood behind the gate.

Earn your five seals. I will be waiting at the Crown Tournament.

Sir Lucan Veyr

Champion of the Crown”

Alden has already recognised the handwriting.

**YOU — choice:** “Who is Lucan Veyr?”

**ALDEN:** “My first squire.”

**YOU — choice:** “What happened at the gate?”

He looks toward the courtyard entrance.

**ALDEN:** “I gave an order.”

**YOU — choice:** “To close it?”

**ALDEN:** “Yes.”

The horn from the opening memory sounds once, faintly. No additional flashback image.

**PLAYER CHOICE — remember the relationship response**

- **Trust:** “Then tell me when you’re ready.”
- **Demand truth:** “Before I carry your teaching further, I need to know why.”
- **Seek another account:** “I’ll hear what Lucan has to say.”

**ALDEN — trust:** “I’ll try to deserve that.”

**ALDEN — demand truth:** “You will hear it. Some of it must come from people who were there.”

**ALDEN — another account:** “You should. Ask the masters as well.”

**MARA:** “Ironbridge is two days east.”

**ALDEN:** “Ilyra saw the gate before it burned. Begin with her.”

He places the old training shield beside the new royal summons.

**ALDEN:** “At dawn, you leave.”

**ON SCREEN:** Chapter One complete.

**NEXT CHAPTER:** The Master of the Bridge.

**NEW QUEST:** Earn Ilyra Dane’s seal. Learn what she witnessed at the Ashen Gate.

## Exercise and training voice cue bank

These are conditional lines, not a fixed speech loop. Repetition feedback follows a completed tracked cycle. Correction cues require the corresponding exercise-specific check to be validated; never substitute a timer or a guessed pose for that evidence.

| Cue | Speaker line | Trigger |
| --- | --- | --- |
| Rep completed | ALDEN: “{count}.” | One complete calibrated repetition |
| Final rep completed | ALDEN: “That’s your set.” | Selected target reached |
| No lower phase | ALDEN: “Show me the lower part before you return.” | Start/reset reached without the calibrated lower phase |
| No reset phase | ALDEN: “Return to your starting position before the next.” | Lower phase reached without returning/resetting |
| Motion is too fast to assess | ALDEN: “A little slower. Give me time to see the movement.” | Validated cadence/phase evidence; not merely low camera FPS |
| Squat range not reached | ALDEN: “You haven’t reached the range we set. Reset, then try again.” | Confident tracking, calibrated personal range missed |
| Push-up alignment drift | ALDEN: “Your hips have drifted from the starting line. Reset.” | Sustained, confidently measured alignment change for the selected variation |
| Joint occluded | ALDEN: “Let me see your shoulder and hips before we continue.” | Required landmarks not visible |
| Tracking absent | ALDEN: “Hold there. We’ll continue when the view is clear.” | Tracking loss; counting pauses |
| Camera setup needs changing | ALDEN: “Set the view from your side for this lesson.” | Exercise setup has not passed its view check |
| Player pauses | ALDEN: “Take your time. Tell me when you’re ready.” | Explicit pause |
| Player changes variation | ALDEN: “A different approach. We’ll set your range again.” | Variant changed; recalibrate |
| Player resumes | ALDEN: “Begin from your starting position.” | Explicit resume with tracking restored |
| Timed exercise inactivity | ALDEN: “We’ll count again when your steps begin.” | Tracked but selected marching/jogging movement absent |
| Timed exercise halfway | ALDEN: “Keep your pace.” | Half of tracked active target time completed |

**Voice priority:** pause/tracking interruption → one relevant correction → repetition acknowledgement → optional encouragement. Speak one line at a time. Apply a cooldown to repeated corrections. A new repetition must not be hidden by a long speech.

For wall, knee-supported, and standard push-ups, the supporting-joint baseline differs. Enable an alignment cue only for a variation whose measurement has been validated. If the camera cannot establish it, give visibility/setup guidance and count only movements it can assess.

## Chapter state and continuity

Persist these decisions so the instructor and later masters can refer to them:

- Player motive: coin, belonging, or truth.
- Chosen exercise variations/targets and first completion flags.
- Once-only stat rewards and travel-purse grant.
- First trial result, demonstrated guard/strike/evasion, and whether the first-win reward has been claimed.
- Purchases, equipment, and actual remaining coin balance.
- Order membership, if the implemented multiplayer flow created it; otherwise solo.
- Final response to Alden: trust, demand truth, or seek another account.
- Chapter completion and the Ironbridge quest.

Returning to a scene or restarting the app must not duplicate coins or stat rewards. Replaying the chapter for practice leaves established progression unchanged.

**The five-master journey:** later chapters can reuse push-ups, squats, and in-place movement with different targets and validated variations. Their distinctiveness comes from combat lessons, rivals, places, and conflicting testimony. Chapter One establishes Ilyra Dane and Ironbridge; the remaining masters can be developed without introducing a different exercise detector for every region.

**The wider conflict:** the dying king needs a protector for his heir; competing orders want influence over that appointment. Alden’s former pupil already holds the title. Winning the final tournament and understanding the gate are connected goals, but the story should allow that being right about one does not settle the other.

## Build and review notes

- Keep speech skippable, captioned, and replayable. Wait for player input rather than forcing dialogue to expire.
- Camera setup, exercise selection, pauses, and rests should take place between scenes without punishment from the story clock.
- All first-chapter rewards and prices above are draft balancing values.
- Exercise detectors, exercise-driven stats, live multiplayer and Orders contests remain implementation work. The local chapter already saves choices, completion, coins and purchased equipment.
- The current presentation combines portraits and captions with a real 3D courtyard, first-person weapons and an animated opponent. Desktop and Android TV emulator playback have passed; final character models and physical Fire TV performance still need work.
- [Game direction](D:/ALEXA+/docs/MEDIEVAL_GAME.md) · [Artwork manifest](D:/ALEXA+/public/assets/medieval/manifest.json) · [Asset gallery](http://localhost:8787/medieval-assets.html)

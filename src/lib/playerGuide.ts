export type GuideTopic = 'setup' | 'combat' | 'story' | 'training' | 'clans';
export const GUIDE_KEY = 'moveroom.player-guide.v1';
export const guidePages: { topic: GuideTopic; label: string; title: string; summary: string; steps: [string, string][]; note: string }[] = [
  { topic: 'setup', label: 'Get ready', title: 'Your phone is the controller.',
    summary: 'Use the Fire TV remote for menus. Your Android camera tracks combat and exercises.',
    steps: [
      ['Pair your own phone', 'Open Connect controller, scan the QR code, then start the camera on your Android phone. Keep both screens on the same game server.'],
      ['Step into the frame', 'Prop the phone facing you. Keep shoulders, elbows, hands and hips visible. Leave space to move your arms with empty hands.'],
      ['Let setup come to you', 'Stay in view for three seconds to continue automatically. Follow the neutral, lean and reach calibration prompts. No reaching back to click is needed.'],
    ], note: 'If tracking stops, step back into view and check the light and phone angle. Desktop preview uses simulated movements and has no camera.' },
  { topic: 'combat', label: 'Sword & shield', title: 'Move the hands. Read the blade.',
    summary: 'Your right hand places the sword. Your left hand places the shield.',
    steps: [
      ['Cut across your opponent', 'Move your right hand and forearm through a deliberate sweep. Stay within sword reach; holding a pose or repeating small twitches will not win.'],
      ['Cover the incoming line', 'Raise your left hand and place the shield high, left or right to meet the blade. A correctly timed guard opens a stronger counter.'],
      ['Use your whole body', 'Lean to move off a cut, crouch under a high cut, or take a small step to adjust range. Lower the shield between exchanges to recover stamina.'],
    ], note: 'Alden teaches shield, cut and lean in Chapter I before your trial. Health decides the winner; stamina limits repeated cuts and held guards.' },
  { topic: 'story', label: 'Your adventure', title: 'Follow the next objective.',
    summary: 'Begin Chapter I, meet Alden, then earn your first victory against Mara.',
    steps: [
      ['Follow the quest marker', 'Select the guided route, or choose Explore with remote: up/down walk and left/right turn. Select speaks or starts a guided walk. Back opens the menu. You can also hold your left hand up to follow the objective.'],
      ['Talk and choose', 'Use the D-pad to highlight a response and Select to confirm or continue. Voices and subtitles tell the story. Camera controls also work: lean to choose and hold your left hand up to confirm.'],
      ['Return to your journey', 'The journal keeps your objective. Train opens Alden’s exercise hall anytime. Clan war hall opens multiplayer. Story choices, coins and gear are saved on this device.'],
    ], note: 'Turn sound on to hear the characters. Choices wait for you. Use Pause to take a break or open the journal and audio settings.' },
  { topic: 'training', label: 'Train with Alden', title: 'Earn every repetition.',
    summary: 'Choose a comfortable variation. Alden assigns the reps, sets and rest.',
    steps: [
      ['Choose today’s routine', 'Open Train from the chapter. Pick shallow or regular squats, then wall, knees or floor push-ups. Starting out gives a short first circuit.'],
      ['Show the movement from the side', 'Move the phone to your side with the required joints visible. Hold the start position, show one comfortable lower position, then return. Counting begins automatically.'],
      ['Complete a controlled cycle', 'Lower and return fully for each rep. Follow the correction caption or voice if an attempt resets. Finish every assigned set and take the 45-second rest before the next one.'],
    ], note: 'A completed camera routine can earn 60 XP once per day and bounded story bonuses. Preview earns no XP. Tell Alden how the routine felt to adjust the next recommendation.' },
  { topic: 'clans', label: 'Clan wars', title: 'Your people are the fighters.',
    summary: 'Each clan brings 1–3 champions. Every pairing is a live human duel.',
    steps: [
      ['Create or join a war', 'One captain creates a 1 vs 1, 2 vs 2 or 3 vs 3 war. Share the war invite with the other players. They choose Join host clan or Opposing clan.'],
      ['Bring your own controller', 'Every fighter uses their own TV/browser screen and paired phone, or a labelled preview. The war invite joins the lobby; the phone QR code pairs your camera. These are different codes.'],
      ['Ready, duel, score', 'Fill both rosters and choose I’m ready. The captain starts. Pairing 01 fights pairing 01, and so on. A win earns one clan point; a draw earns half a point each.'],
    ], note: 'Everyone uses starter gear in this prototype. Clans and results last for the server session. A paused or missing fighter has 30 seconds to return before forfeiting.' },
];
export function hasSeenGuide() {
  try { return localStorage.getItem(GUIDE_KEY) === 'seen'; } catch { return false; }
}
export function rememberGuide() {
  try { localStorage.setItem(GUIDE_KEY, 'seen'); } catch { /* The guide remains usable without storage. */ }
}

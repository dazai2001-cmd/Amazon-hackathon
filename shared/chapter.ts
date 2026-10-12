import catalogue from '../content/story/chapter-01-dialogue.json';

export type Quest = 'alden' | 'training' | 'mara' | 'forge' | 'orders' | 'gate' | 'done';
export type StoryFocus = 'alden' | 'mara' | 'forge' | 'orders' | 'gate' | 'memory' | 'panorama';
export type ConversationId = 'arrival' | 'guard-done' | 'cut-done' | 'lesson-done' | 'mara' | 'victory' | 'defeat' | 'forge' | 'orders' | 'letter' | 'farewell';
export type StoryAction = 'lesson-shield' | 'lesson-cut' | 'lesson-evade' | 'quest-training' | 'quest-mara' | 'quest-forge' | 'quest-orders' | 'quest-gate' | 'briefing' | 'shop' | 'complete';
export type StoryChoice = { text: string; next: string; motive?: 'coin' | 'belonging' | 'truth'; relationship?: 'trust' | 'truth' | 'lucan' };
export type StoryNode = {
  key: string; speaker: string; text: string; voiceId?: string; next?: string; focus?: StoryFocus;
  choices?: StoryChoice[]; byMotive?: { coin: string; belonging: string; truth: string };
};
export type Conversation = { title: string; focus: StoryFocus; end: StoryAction; nodes: StoryNode[] };
export const dialogueLine = (scene: number, number: number) => {
  const id = `C01_S${String(scene).padStart(2, '0')}_L${String(number).padStart(3, '0')}`;
  const value = catalogue.dialogue.find(l => l.id === id);
  if (!value) throw new Error(`Missing chapter line ${id}`);
  return value;
};
const say = (key: string, scene: number, number: number, next?: string, extra: Partial<StoryNode> = {}): StoryNode => {
  const line = dialogueLine(scene, number);
  return { key, speaker: line.speaker, text: line.text, voiceId: line.id, next, ...extra };
};
const you = (key: string, text: string, next: string): StoryNode => ({ key, speaker: 'YOU', text, next });

export const conversations: Record<ConversationId, Conversation> = {
  arrival: { title: 'A new squire', focus: 'alden', end: 'quest-training', nodes: [
    say('early', 1, 3, undefined, { choices: [
      { text: 'You said dawn.', next: 'dawn' },
      { text: 'I couldn’t sleep.', next: 'sleepless' },
      { text: 'I heard you still train squires.', next: 'squires' },
    ] }),
    say('dawn', 1, 4, 'reason'), say('sleepless', 1, 5, 'reason'), say('squires', 1, 6, 'reason'),
    say('reason', 1, 7, undefined, { choices: [
      { text: 'The tournament purse. I need a living.', next: 'coin', motive: 'coin' },
      { text: 'I want an order that would take me.', next: 'belonging', motive: 'belonging' },
      { text: 'People call you a traitor. I want to know why.', next: 'truth', motive: 'truth' },
    ] }),
    say('coin', 1, 8, 'kit'), say('belonging', 1, 9, 'kit'), say('truth', 1, 10, 'kit'),
    say('kit', 1, 11, 'control'), say('control', 1, 12, 'herald'),
    say('herald', 2, 1, 'order-question', { focus: 'gate' }),
    you('order-question', 'Does that include your order?', 'struck'),
    say('struck', 2, 2, 'banner-question'), you('banner-question', 'Then we could make another.', 'banner'),
    say('banner', 2, 3, 'mara-arrives'), say('mara-arrives', 2, 4, 'shield-first', { focus: 'mara' }),
    say('shield-first', 2, 5, 'sunset'), say('sunset', 2, 6, 'lesson', { focus: 'mara' }),
    say('lesson', 2, 7),
  ] },
  'guard-done': { title: 'The space behind a shield', focus: 'alden', end: 'lesson-cut', nodes: [say('guard', 4, 2, 'cut'), say('cut', 4, 3)] },
  'cut-done': { title: 'The space beside you', focus: 'alden', end: 'lesson-evade', nodes: [say('cut', 4, 4, 'evade'), say('evade', 4, 5)] },
  'lesson-done': { title: 'An invitation to the lists', focus: 'alden', end: 'quest-mara', nodes: [
    say('space', 4, 6, 'stamina'), say('stamina', 4, 7, 'interruption'),
    say('interruption', 4, 8, 'first', { focus: 'mara' }), say('first', 4, 9, 'squire'), say('squire', 4, 10, undefined, { focus: 'mara' }),
  ] },
  mara: { title: 'Earn the opening', focus: 'mara', end: 'briefing', nodes: [
    say('rules', 5, 1, undefined, { choices: [
      { text: 'I’ve never fought in an arena.', next: 'first-arena' }, { text: 'I’m ready.', next: 'ready' }, { text: 'What happens if I lose?', next: 'lose' },
    ] }),
    say('first-arena', 5, 2, 'shoulders'), say('ready', 5, 3, 'shoulders'), say('lose', 5, 4, 'shoulders'), say('shoulders', 5, 5, undefined, { focus: 'alden' }),
  ] },
  victory: { title: 'Your first victory', focus: 'mara', end: 'quest-forge', nodes: [
    say('trial', 5, 12, 'mentor'), say('mentor', 5, 13, 'compliment', { focus: 'alden' }), say('compliment', 5, 14, 'ironbridge'),
    say('ironbridge', 5, 15, undefined, { byMotive: { coin: 'coin', belonging: 'belonging', truth: 'truth' } }),
    say('coin', 5, 20), say('belonging', 5, 21), say('truth', 5, 22),
  ] },
  defeat: { title: 'Every exchange teaches', focus: 'mara', end: 'quest-forge', nodes: [
    say('trial', 5, 16, 'moment'), say('moment', 5, 17, 'again', { focus: 'alden' }), say('again', 5, 18, 'ironbridge'),
    say('ironbridge', 5, 19, undefined, { byMotive: { coin: 'coin', belonging: 'belonging', truth: 'truth' } }),
    say('coin', 5, 20), say('belonging', 5, 21), say('truth', 5, 22),
  ] },
  forge: { title: 'Tomas’s counter', focus: 'forge', end: 'shop', nodes: [
    say('squire', 6, 1, 'made'), you('made', 'You made it?', 'repairs'), say('repairs', 6, 2, 'purse'),
    say('purse', 6, 3, 'loan'), you('loan', 'A loan?', 'investment'), say('investment', 6, 4, 'kit'), say('kit', 6, 5),
  ] },
  orders: { title: 'A name beside yours', focus: 'orders', end: 'quest-gate', nodes: [
    say('road', 7, 1, 'alone'), you('alone', 'And if I travel alone?', 'seals'), say('seals', 7, 2, 'companions'),
    say('companions', 7, 3, 'depend'), say('depend', 7, 4, 'name', { focus: 'alden' }), say('name', 7, 6),
  ] },
  letter: { title: 'The letter', focus: 'gate', end: 'complete', nodes: [
    say('proclamation', 8, 1, 'read-letter'),
    { key: 'read-letter', speaker: 'SIR LUCAN VEYR · A LETTER', text: 'If he teaches you to hold a shield, ask him who stood behind the gate. Earn your five seals. I will be waiting at the Crown Tournament.', next: 'lucan' },
    you('lucan', 'Who is Lucan?', 'first-squire'), say('first-squire', 8, 2, 'what-happened'),
    you('what-happened', 'What happened at the Ashen Gate?', 'order'), say('order', 8, 3, 'your-order'),
    you('your-order', 'Your order?', 'yes'),
    say('yes', 8, 4, undefined, { choices: [
      { text: 'Then tell me when you’re ready.', next: 'trust', relationship: 'trust' },
      { text: 'Before I carry your teaching further, I need to know why.', next: 'truth', relationship: 'truth' },
      { text: 'I’ll hear what Lucan has to say.', next: 'lucan-answer', relationship: 'lucan' },
    ] }),
    say('trust', 8, 5, 'east'), say('truth', 8, 6, 'east'), say('lucan-answer', 8, 7, 'east'),
    say('east', 8, 8, 'ilyra'), say('ilyra', 8, 9, 'dawn'), say('dawn', 8, 10),
  ] },
  farewell: { title: 'The road east', focus: 'gate', end: 'complete', nodes: [say('dawn', 8, 10)] },
};

export const questText: Record<Quest, { title: string; detail: string; target: string }> = {
  alden: { title: 'A new squire', detail: 'Find Sir Alden in the courtyard.', target: 'Sir Alden Vale' },
  training: { title: 'The space behind a shield', detail: 'Return to Alden for your first lesson.', target: 'Training yard' },
  mara: { title: 'Earn the opening', detail: 'Speak to Mara in the lists.', target: 'Mara Venn' },
  forge: { title: 'Steel for the road', detail: 'Visit Tomas at the forge.', target: 'Tomas’s forge' },
  orders: { title: 'A name beside yours', detail: 'Meet Mara by the Orders board.', target: 'Orders board' },
  gate: { title: 'The letter', detail: 'Meet Alden and Mara at the gate.', target: 'The east gate' },
  done: { title: 'The road to Ironbridge', detail: 'Earn Ilyra Dane’s seal. Learn what she witnessed.', target: 'Ironbridge' },
};

export type StoryProgress = { version: 2; quest: Quest; memorySeen: boolean; lessonDone: boolean };
export const newStoryProgress = (): StoryProgress => ({ version: 2, quest: 'alden', memorySeen: false, lessonDone: false });
export function readStoryProgress(value: unknown): StoryProgress {
  if (!value || typeof value !== 'object') return newStoryProgress();
  const s = value as StoryProgress;
  if (s.version !== 2 || !Object.keys(questText).includes(s.quest) || typeof s.memorySeen !== 'boolean' || typeof s.lessonDone !== 'boolean') return newStoryProgress();
  return { version: 2, quest: s.quest, memorySeen: s.memorySeen, lessonDone: s.lessonDone };
}

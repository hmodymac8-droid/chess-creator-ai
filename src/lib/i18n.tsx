import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { PieceType, Rules } from "./engine";

export type Lang = "en" | "ar";
export const LANGS: Lang[] = ["en", "ar"];
const STORAGE_KEY = "lang";

const en = {
  langName: "English",
  appName: "Chess Variant Designer",
  tagline: "Rules Lab",
  signIn: "Sign in",
  signOut: "Sign out",
  about: "About",
  switchLang: "العربية",
  // Board / local game
  board: "Board",
  playEngine: "Play the engine",
  newGame: "New game",
  aiOpponent: "AI opponent",
  darkPieces: "Dark pieces",
  you: "You",
  white: "White",
  dark: "Dark",
  empty: "empty",
  boardLabel: "Chess board",
  piece: "Piece",
  wonOnTime: "You won on time!",
  won: "You won!",
  timeUp: "Your time is up",
  gameOver: "Game over",
  noMoves: "No moves available",
  yourTurn: "Your turn",
  engineThinking: "Engine is thinking…",
  recentMoves: "Recent moves",
  // Creator
  createTitle: "Create your variant",
  createSub: "Describe how the pieces move in your own words, then start playing.",
  rulesLabel: "Game rules",
  examples: (n: number) => `Examples (${n})`,
  pickExample: "Pick an example…",
  myExamples: "My variants (private)",
  presetExamples: "Ready-made examples",
  timer: "Timer",
  noTimer: "No timer",
  minutes: (n: number) => `${n} min`,
  increment: "Increment per move",
  seconds: (n: number) => `${n} sec`,
  generating: "Drafting the rules…",
  create: "Create game",
  inviting: "Preparing invite…",
  playFriend: "Play a friend online",
  signInHint: "Sign in to save your variants and invite friends.",
  currentVariant: "Current variant",
  backToClassic: "Back to classic rules",
  goalKing: "Goal: capture the enemy king",
  goalAll: "Goal: capture every enemy piece",
  // Move descriptions
  mv: {
    all: "in all directions",
    diagonal: "diagonally",
    forward: "forward",
    straight: "horizontally and vertically",
    knight: "in an L shape",
    dirs: (v: string) => `in directions ${v}`,
    upTo: (n: number) => `up to ${n} squares`,
    one: "one square",
    noCapture: "without capturing",
    captureOnly: "capture only",
    jumps: "jumps over pieces",
    first: "first move only",
  },
  // Errors
  err: {
    aiNotConfigured: "The AI key is not configured on the server.",
    unknown: "Unknown error",
    connection: "Connection failed. Please try again.",
    invite: "Couldn't create the invite",
    rateLimited: "Too many requests, try again shortly.",
    credits: "AI credits have run out.",
    parse: "Couldn't turn the description into rules. Try rephrasing it.",
    unavailable: "The AI service is busy right now. Try again in a moment.",
  } as Record<string, string>,
  // Auth
  auth: {
    signInTab: "Sign in",
    signUpTab: "New account",
    name: "Name",
    password: "Password",
    wait: "One moment…",
    enter: "Sign in",
    createAccount: "Create account",
  },
  authErr: {
    nameLength: "Name must be 2 to 24 characters",
    pwLength: "Password must be at least 6 characters",
    nameTaken: "This name is already taken",
    weakPw: "Password is weak or leaked, choose another",
    signUpFailed: "Couldn't create the account",
    badCredentials: "Incorrect name or password",
  } as Record<string, string>,
  // Online game
  online: {
    invited: "Your friend invited you to play",
    signInToJoin: "Sign in or create an account to join the match.",
    notFound: "This match doesn't exist or is full.",
    loading: "Loading match…",
    others: "This match is between other players.",
    waitingName: "Waiting for your friend…",
    waitingJoin: "Waiting for your friend to join",
    youWon: "You won! 🎉",
    youLost: "You lost the match",
    friendTurn: "Your friend's turn",
    match: "Online match",
    sendLink: "Send this link to your friend",
    copied: "Copied",
    copyLink: "Copy link",
    timerInfo: (m: number, i: number) => `Timer: ${m} min + ${i} sec`,
    whiteStarts: "White moves first",
    back: "Back to the lab",
  },
  // About
  aboutBody:
    "Invent brand-new chess rules by describing them in plain language. AI turns your description into playable rules, and an engine that understands them plays against you — or challenge a friend online.",
  version: "Version",
  source: "Source code",
  pieceCredit: "Piece artwork: Colin M.L. Burnett (cburnett), via Lichess / chessground.",
  close: "Close",
  // Not found / error
  notFoundTitle: "Page not found",
  notFoundBody: "The page you're looking for doesn't exist or has been moved.",
  goHome: "Go home",
  errorTitle: "This page didn't load",
  errorBody: "Something went wrong on our end. You can try refreshing or head back home.",
  tryAgain: "Try again",
  // Classic rules
  classicName: "Classic Chess",
  classicDesc: "The traditional rules. Write a description to invent your own variant.",
  pieces: { K: "King", Q: "Queen", R: "Rook", B: "Bishop", N: "Knight", P: "Pawn" } as Record<PieceType, string>,
  examplesList: [
    { title: "Classic Chess", text: "Classic chess with its standard rules" },
    { title: "Diagonal Knight", text: "The knight moves like a bishop, and pawns can jump over pieces" },
    { title: "Leaping Rook", text: "The rook jumps over pieces, and the king moves two squares in any direction" },
    { title: "Knightly Bishop", text: "The bishop can also move like a knight, and the queen moves at most three squares" },
    { title: "Mighty King", text: "The king moves like a queen, and the queen only moves like a king" },
    { title: "Warrior Pawns", text: "Pawns move and capture one square in any direction" },
    { title: "Flying Knights", text: "The knight jumps in a large (3,1) L shape" },
    { title: "Limited Queen", text: "The queen moves only two squares in any direction, and the rook moves like a queen" },
    { title: "Leaping Bishops", text: "The bishop jumps over pieces diagonally and captures forward only" },
    { title: "Royal Rook", text: "The rook can also take a single diagonal step like a king" },
    { title: "Long Pawn", text: "Pawns always move up to three squares forward and capture diagonally" },
    { title: "Prince Knight", text: "The knight moves like both a knight and a king" },
    { title: "Camel", text: "The knight becomes a camel jumping (3,1) and the bishop moves like a rook" },
    { title: "Turtles", text: "Every piece moves only one square in its directions" },
    { title: "Amazon", text: "The queen moves like both a queen and a knight" },
    { title: "Blind Rook", text: "The rook only captures one square diagonally, and moves horizontally and vertically without capturing" },
    { title: "Ghost Pawn", text: "Pawns jump over pieces and capture straight forward" },
    { title: "Board Chaos", text: "Every piece jumps over pieces, and the king moves like a knight" },
  ],
};

export type Dict = typeof en;

const ar: Dict = {
  langName: "العربية",
  appName: "مُصمم الشطرنج",
  tagline: "مختبر القواعد",
  signIn: "تسجيل الدخول",
  signOut: "خروج",
  about: "حول",
  switchLang: "English",
  board: "الرقعة",
  playEngine: "العب ضد المحرك",
  newGame: "لعبة جديدة",
  aiOpponent: "المنافس الذكي",
  darkPieces: "القطع الداكنة",
  you: "أنت",
  white: "الأبيض",
  dark: "داكن",
  empty: "فارغة",
  boardLabel: "رقعة الشطرنج",
  piece: "قطعة",
  wonOnTime: "انتصرت بالوقت!",
  won: "انتصرت!",
  timeUp: "انتهى وقتك",
  gameOver: "انتهت اللعبة",
  noMoves: "لا توجد حركات",
  yourTurn: "دورك الآن",
  engineThinking: "المحرك يفكر…",
  recentMoves: "آخر الحركات",
  createTitle: "ابتكر نسختك",
  createSub: "صِف حركة القطع بكلماتك، وابدأ اللعب.",
  rulesLabel: "قواعد اللعبة",
  examples: (n) => `قائمة الأمثلة (${n})`,
  pickExample: "اختر مثالاً…",
  myExamples: "أمثلتي (خاصة بك)",
  presetExamples: "أمثلة جاهزة",
  timer: "المؤقت",
  noTimer: "بدون مؤقت",
  minutes: (n) => `${n} دقيقة`,
  increment: "زيادة لكل حركة",
  seconds: (n) => `${n} ثانية`,
  generating: "جارٍ صياغة القواعد…",
  create: "ابتكر اللعبة",
  inviting: "جارٍ تجهيز الدعوة…",
  playFriend: "العب مع صديق أونلاين",
  signInHint: "سجّل الدخول لحفظ أمثلتك ودعوة أصدقائك.",
  currentVariant: "النسخة الحالية",
  backToClassic: "العودة للقواعد الكلاسيكية",
  goalKing: "الهدف: أسر ملك الخصم",
  goalAll: "الهدف: أسر كل قطع الخصم",
  mv: {
    all: "في جميع الاتجاهات",
    diagonal: "قطرياً",
    forward: "للأمام",
    straight: "أفقياً وعمودياً",
    knight: "على شكل حرف L",
    dirs: (v) => `باتجاهات ${v}`,
    upTo: (n) => `حتى ${n} خانات`,
    one: "خانة واحدة",
    noCapture: "بلا أسر",
    captureOnly: "للأسر فقط",
    jumps: "يتخطى القطع",
    first: "أول حركة",
  },
  err: {
    aiNotConfigured: "مفتاح الذكاء الاصطناعي غير مُعدّ على الخادم.",
    unknown: "خطأ غير معروف",
    connection: "تعذّر الاتصال. حاول مجدداً.",
    invite: "تعذّر إنشاء الدعوة",
    rateLimited: "طلبات كثيرة، حاول بعد قليل.",
    credits: "نفد رصيد الذكاء الاصطناعي.",
    parse: "تعذّر تحويل الوصف إلى قواعد. جرّب صياغة أخرى.",
    unavailable: "خدمة الذكاء الاصطناعي مشغولة الآن. حاول بعد قليل.",
  },
  auth: {
    signInTab: "تسجيل الدخول",
    signUpTab: "حساب جديد",
    name: "الاسم",
    password: "كلمة المرور",
    wait: "لحظة…",
    enter: "دخول",
    createAccount: "إنشاء الحساب",
  },
  authErr: {
    nameLength: "الاسم يجب أن يكون بين 2 و 24 حرفاً",
    pwLength: "كلمة المرور 6 أحرف على الأقل",
    nameTaken: "هذا الاسم مستخدم",
    weakPw: "كلمة المرور ضعيفة أو مسرّبة، اختر غيرها",
    signUpFailed: "تعذّر إنشاء الحساب",
    badCredentials: "الاسم أو كلمة المرور غير صحيحة",
  },
  online: {
    invited: "صديقك يدعوك للعب",
    signInToJoin: "سجّل الدخول أو أنشئ حساباً للانضمام إلى المباراة.",
    notFound: "هذه المباراة غير موجودة أو ممتلئة.",
    loading: "جارٍ تحميل المباراة…",
    others: "هذه المباراة بين لاعبين آخرين.",
    waitingName: "بانتظار صديقك…",
    waitingJoin: "بانتظار انضمام صديقك",
    youWon: "انتصرت! 🎉",
    youLost: "خسرت المباراة",
    friendTurn: "دور صديقك",
    match: "مباراة أونلاين",
    sendLink: "أرسل هذا الرابط لصديقك",
    copied: "تم النسخ",
    copyLink: "نسخ الرابط",
    timerInfo: (m, i) => `المؤقت: ${m} دقيقة + ${i} ثانية`,
    whiteStarts: "الأبيض يبدأ",
    back: "العودة للمختبر",
  },
  aboutBody:
    "ابتكر قواعد شطرنج جديدة كلياً بوصفها بكلماتك. يحوّل الذكاء الاصطناعي وصفك إلى قواعد قابلة للعب، ويلعب ضدك محرك يفهمها — أو تحدَّ صديقك أونلاين.",
  version: "الإصدار",
  source: "الكود المصدري",
  pieceCredit: "رسومات القطع: Colin M.L. Burnett (cburnett) عبر Lichess / chessground.",
  close: "إغلاق",
  notFoundTitle: "الصفحة غير موجودة",
  notFoundBody: "الصفحة التي تبحث عنها غير موجودة أو تم نقلها.",
  goHome: "الصفحة الرئيسية",
  errorTitle: "تعذّر تحميل الصفحة",
  errorBody: "حدث خطأ من جهتنا. جرّب إعادة التحميل أو العودة للصفحة الرئيسية.",
  tryAgain: "حاول مجدداً",
  classicName: "الشطرنج الكلاسيكي",
  classicDesc: "القواعد التقليدية. اكتب وصفاً لابتكار نسختك الخاصة.",
  pieces: { K: "الملك", Q: "الوزير", R: "الرخ", B: "الفيل", N: "الحصان", P: "البيدق" },
  examplesList: [
    { title: "الشطرنج الكلاسيكي", text: "الشطرنج الكلاسيكي بقواعده المعروفة" },
    { title: "الحصان القطري", text: "حصان يتحرك كالفيل، وبيدق يمكنه القفز فوق القطع" },
    { title: "الرخ القافز", text: "الرخ يقفز فوق القطع، والملك يتحرك خانتين في أي اتجاه" },
    { title: "الفيل الفارس", text: "الفيل يتحرك أيضاً كالحصان، والوزير لا يتحرك إلا ثلاث خانات" },
    { title: "الملك الجبار", text: "الملك يتحرك مثل الوزير، والوزير يتحرك مثل الملك فقط" },
    { title: "البيادق المحاربة", text: "البيدق يتحرك ويأسر في أي اتجاه خانة واحدة" },
    { title: "الأحصنة الطائرة", text: "الحصان يقفز ثلاث خانات بشكل حرف L كبير (3،1)" },
    { title: "الوزير المحدود", text: "الوزير يتحرك خانتين فقط في أي اتجاه، والرخ يتحرك كالوزير" },
    { title: "الأفيال القافزة", text: "الفيل يقفز فوق القطع قطرياً ويأسر للأمام فقط" },
    { title: "الرخ الملكي", text: "الرخ يتحرك أيضاً خطوة قطرية واحدة مثل الملك" },
    { title: "البيدق الطويل", text: "البيدق يتحرك حتى ثلاث خانات للأمام دائماً ويأسر قطرياً" },
    { title: "الحصان الأمير", text: "الحصان يتحرك كالحصان والملك معاً" },
    { title: "الجمل", text: "الحصان يصبح جملاً يقفز (3،1) والفيل يتحرك كالرخ" },
    { title: "السلاحف", text: "كل القطع تتحرك خانة واحدة فقط في اتجاهاتها" },
    { title: "الأمازون", text: "الوزير يتحرك كالوزير والحصان معاً" },
    { title: "الرخ الأعمى", text: "الرخ لا يأسر إلا قطرياً خانة واحدة، ويتحرك أفقياً وعمودياً بلا أسر" },
    { title: "البيدق الشبح", text: "البيدق يقفز فوق القطع ويأسر للأمام مباشرة" },
    { title: "فوضى الرقعة", text: "كل القطع تقفز فوق القطع، والملك يتحرك كالحصان" },
  ],
};

export const DICTS: Record<Lang, Dict> = { en, ar };

type Ctx = { lang: Lang; t: Dict; dir: "ltr" | "rtl"; setLang: (l: Lang) => void };
const I18nContext = createContext<Ctx>({ lang: "en", t: en, dir: "ltr", setLang: () => {} });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "en" || saved === "ar") setLangState(saved);
    } catch { /* storage unavailable */ }
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);
  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch { /* storage unavailable */ }
  }, []);
  return (
    <I18nContext.Provider value={{ lang, t: DICTS[lang], dir: lang === "ar" ? "rtl" : "ltr", setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);

// Rules are data: classic names may be stored in either language, so map known
// built-in names to the active language and leave AI-generated names untouched.
const isClassic = (r: Rules) => LANGS.some((l) => DICTS[l].classicName === r.name);
export const variantName = (r: Rules, t: Dict) => (isClassic(r) ? t.classicName : r.name);
export const variantDesc = (r: Rules, t: Dict) => (isClassic(r) ? t.classicDesc : r.description);
export const pieceName = (r: Rules, k: PieceType, t: Dict) => {
  const n = r.pieces[k].name;
  return LANGS.some((l) => DICTS[l].pieces[k] === n) ? t.pieces[k] : n;
};

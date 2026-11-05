// Editable site content. Update names, roles and photos here.

export const navLinks = [
  { id: "home", label: "Home" },
  { id: "about", label: "About Us" },
  { id: "members", label: "Members" },
  { id: "facilities", label: "Facilities" },
  { id: "admission", label: "Admission" },
  { id: "gallery", label: "Gallery" },
  { id: "contact", label: "Contact Us" },
];

export const ticker = [
  "Professional coaching",
  "Real cricket field",
  "Fitness training",
  "Match practice",
  "Discipline",
  "Established 2026",
];

export const pillars = [
  {
    title: "Strong foundation",
    text: "The right technique, learned on a real cricket field with coaches guiding every session.",
  },
  {
    title: "Discipline & fitness",
    text: "The habits and physical conditioning that players need to compete at a higher level.",
  },
  {
    title: "Real match practice",
    text: "Playing in match conditions tests skills under pressure and builds game awareness.",
  },
];

// Set `photo` to a file in /public, for example "/members/head-coach.jpg".
export const members: {
  name: string;
  role: string;
  photo?: string;
}[] = [
  { name: "Name to be added", role: "Head Coach" },
  { name: "Name to be added", role: "Batting Coach" },
  { name: "Name to be added", role: "Bowling Coach" },
  { name: "Name to be added", role: "Fitness Trainer" },
];

export const facilities = [
  {
    icon: "target",
    title: "Real Cricket Field",
    text: "Train on a real cricket ground, so every session prepares you for the conditions you play in.",
  },
  {
    icon: "coach",
    title: "Professional Coaching",
    text: "Structured sessions on technique and game awareness, for beginners and experienced players.",
  },
  {
    icon: "fitness",
    title: "Fitness Training",
    text: "Strength, speed and endurance work designed around what cricket demands of the body.",
  },
  {
    icon: "match",
    title: "Match Practice",
    text: "Put your training to the test in game situations, and learn how to handle them.",
  },
] as const;

export const programs = [
  {
    title: "Kids",
    text: "Learn the right basics early, build confidence and enjoy the game.",
  },
  {
    title: "Adults",
    text: "Start fresh or sharpen your game, with coaching that fits your level.",
  },
];

export const steps = [
  {
    title: "Send your details",
    text: "Fill in the form and tell us about the player.",
  },
  {
    title: "Visit the academy",
    text: "Meet the coaches and see the field and facilities.",
  },
  {
    title: "Join the academy",
    text: "Choose the right batch and start your training.",
  },
];

// Set `photo` to a file in /public, for example "/gallery/field.jpg".
export const gallery: {
  caption: string;
  photo?: string;
  span: string;
}[] = [
  { caption: "On the field", span: "md:col-span-2 md:row-span-2" },
  { caption: "Coaching sessions", span: "" },
  { caption: "Fitness training", span: "" },
  { caption: "Match day", span: "md:col-span-2" },
  { caption: "Young players", span: "" },
  { caption: "The team", span: "md:col-span-3" },
];

// Shared vocabularies. Using fixed lists (instead of free text) keeps matching
// predictable: "Tutoring" and "tutoring " can never be treated as different skills.

export const SKILLS = [
  'Tutoring',
  'Mentoring',
  'Cooking',
  'Food handling',
  'Driving',
  'Heavy lifting',
  'Gardening',
  'Carpentry',
  'Event setup',
  'Graphic design',
  'Social media',
  'Web development',
  'Data entry',
  'Bookkeeping',
  'Translation (Spanish)',
  'Translation (Mandarin)',
  'First aid',
  'Childcare',
  'Elder companionship',
  'Animal care',
  'Photography',
  'Public speaking',
  'Tech support',
];

export const AVAILABILITY_SLOTS = [
  { id: 'wkday_morning', label: 'Weekday mornings' },
  { id: 'wkday_afternoon', label: 'Weekday afternoons' },
  { id: 'wkday_evening', label: 'Weekday evenings' },
  { id: 'wkend_morning', label: 'Weekend mornings' },
  { id: 'wkend_afternoon', label: 'Weekend afternoons' },
  { id: 'wkend_evening', label: 'Weekend evenings' },
];

export const CATEGORIES = [
  'Food security',
  'Education',
  'Environment',
  'Seniors',
  'Health',
  'Animals',
  'Arts & culture',
  'Housing',
  'Digital access',
];

export const URGENCY_LEVELS = [
  { id: 'low', label: 'Low', rank: 1 },
  { id: 'medium', label: 'Medium', rank: 2 },
  { id: 'high', label: 'High', rank: 3 },
  { id: 'critical', label: 'Critical', rank: 4 },
];

// Volunteers choose an age band rather than a birth date, so we never store exact ages.
// `minAge` is the youngest age inside the band and is what eligibility checks compare.
export const AGE_BANDS = [
  { id: '14_15', label: '14–15', minAge: 14, isMinor: true },
  { id: '16_17', label: '16–17', minAge: 16, isMinor: true },
  { id: '18_20', label: '18–20', minAge: 18, isMinor: false },
  { id: '21_plus', label: '21 or older', minAge: 21, isMinor: false },
];

export const MIN_AGE_OPTIONS = [14, 16, 18, 21];

export const slotLabel = (id) => AVAILABILITY_SLOTS.find((s) => s.id === id)?.label ?? id;
export const urgencyRank = (id) => URGENCY_LEVELS.find((u) => u.id === id)?.rank ?? 0;
export const urgencyLabel = (id) => URGENCY_LEVELS.find((u) => u.id === id)?.label ?? id;
export const ageBand = (id) => AGE_BANDS.find((b) => b.id === id);

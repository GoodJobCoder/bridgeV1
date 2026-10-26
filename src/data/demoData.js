// FICTIONAL demo records. Every organization and person below is invented.
// No contact details exist for anyone. Records reference each other through
// `key` fields, which the seeder swaps for real database IDs.
//
// Demo assignments are only "interested" or "confirmed": no completions or
// hours are seeded, because Bridge never fabricates completed service.

export const DEMO_ORGANIZATIONS = [
  { key: 'pantry', name: 'Riverside Food Pantry', description: 'Neighborhood pantry distributing groceries to roughly 300 families each week.', neighborhood: 'Riverside', focus: 'Food security' },
  { key: 'learning', name: 'Northgate Learning Center', description: 'After-school tutoring and mentoring for middle and high school students.', neighborhood: 'Northgate', focus: 'Education' },
  { key: 'parks', name: 'Greenway Parks Alliance', description: 'Volunteer-powered care for trails, gardens, and creeks.', neighborhood: 'Citywide', focus: 'Environment' },
  { key: 'seniors', name: 'Maple Senior Commons', description: 'Community center offering companionship and tech help for older adults.', neighborhood: 'Maple Heights', focus: 'Seniors' },
  { key: 'shelter', name: 'Paws & Whiskers Shelter', description: 'No-kill shelter caring for cats and dogs awaiting adoption.', neighborhood: 'Eastside', focus: 'Animals' },
];

const base = {
  status: 'open',
  supervised: true,
  serves_minors: false,
  requires_background_check: false,
  secondary_categories: [],
  preferred_skills: [],
  schedule_mode: 'any',
};

export const DEMO_OPPORTUNITIES = [
  { ...base, key: 'sort', org: 'pantry', title: 'Saturday food sorting crew', category: 'Food security', urgency: 'high', description: 'Sort donated groceries and pack family boxes before distribution.', required_skills: ['Food handling'], preferred_skills: ['Heavy lifting'], schedule_slots: ['wkend_morning'], capacity: 6, min_age: 14, hours_per_session: 3, location: 'Riverside Food Pantry warehouse' },
  { ...base, key: 'deliver', org: 'pantry', title: 'Home grocery delivery drivers', category: 'Food security', secondary_categories: ['Seniors'], urgency: 'critical', description: 'Deliver pre-packed boxes to homebound neighbors. Must use your own vehicle.', required_skills: ['Driving'], schedule_slots: ['wkday_afternoon', 'wkend_afternoon'], capacity: 3, min_age: 21, supervised: false, requires_background_check: true, hours_per_session: 2, location: 'Starts at Riverside Food Pantry' },
  { ...base, key: 'flyer', org: 'pantry', title: 'Design a multilingual pantry flyer', category: 'Food security', secondary_categories: ['Arts & culture'], urgency: 'medium', description: 'Create a one-page flyer in English and Spanish explaining pantry hours.', required_skills: ['Graphic design'], preferred_skills: ['Translation (Spanish)'], schedule_slots: [], capacity: 1, min_age: 16, supervised: false, hours_per_session: 4, location: 'Remote' },
  { ...base, key: 'tutor', org: 'learning', title: 'Math homework tutors', category: 'Education', urgency: 'high', description: 'Help students in grades 6–9 with math homework in a supervised classroom.', required_skills: ['Tutoring'], preferred_skills: ['Mentoring'], schedule_slots: ['wkday_afternoon', 'wkday_evening'], capacity: 4, min_age: 18, serves_minors: true, requires_background_check: true, hours_per_session: 2, location: 'Northgate Learning Center, Room 4' },
  { ...base, key: 'peer', org: 'learning', title: 'Teen peer reading buddies', category: 'Education', urgency: 'medium', description: 'High school volunteers read with younger students. Staff present at all times.', required_skills: [], preferred_skills: ['Public speaking'], schedule_slots: ['wkday_afternoon'], capacity: 5, min_age: 14, serves_minors: true, hours_per_session: 1, location: 'Northgate Learning Center library' },
  { ...base, key: 'cleanup', org: 'parks', title: 'Creek cleanup day', category: 'Environment', urgency: 'medium', description: 'Remove litter and invasive plants along Willow Creek. Gloves provided.', required_skills: [], preferred_skills: ['Heavy lifting', 'Gardening'], schedule_slots: ['wkend_morning'], schedule_mode: 'all', capacity: 15, min_age: 14, hours_per_session: 3, location: 'Willow Creek trailhead' },
  { ...base, key: 'garden', org: 'parks', title: 'Community garden bed builders', category: 'Environment', secondary_categories: ['Food security'], urgency: 'low', description: 'Build raised garden beds for a new community plot.', required_skills: ['Carpentry'], preferred_skills: ['Gardening'], schedule_slots: ['wkend_morning', 'wkend_afternoon'], schedule_mode: 'all', capacity: 4, min_age: 16, hours_per_session: 5, location: 'Elm Street community plot' },
  { ...base, key: 'techhelp', org: 'seniors', title: 'Smartphone help desk', category: 'Seniors', secondary_categories: ['Digital access'], urgency: 'high', description: 'Help older adults with video calls, texting, and avoiding scams.', required_skills: ['Tech support'], preferred_skills: ['Elder companionship', 'Translation (Mandarin)'], schedule_slots: ['wkday_morning', 'wkday_afternoon'], capacity: 3, min_age: 16, hours_per_session: 2, location: 'Maple Senior Commons lounge' },
  { ...base, key: 'social', org: 'seniors', title: 'Afternoon companionship visits', category: 'Seniors', urgency: 'medium', description: 'Play games and chat with residents in the common room.', required_skills: ['Elder companionship'], schedule_slots: ['wkday_afternoon', 'wkend_afternoon'], capacity: 6, min_age: 16, hours_per_session: 2, location: 'Maple Senior Commons' },
  { ...base, key: 'dogs', org: 'shelter', title: 'Dog walking & kennel care', category: 'Animals', urgency: 'critical', description: 'Walk dogs and refresh kennels. Training session required on first visit.', required_skills: ['Animal care'], schedule_slots: ['wkday_morning', 'wkend_morning'], capacity: 4, min_age: 16, hours_per_session: 2, location: 'Paws & Whiskers Shelter' },
  { ...base, key: 'photos', org: 'shelter', title: 'Adoption profile photographer', category: 'Animals', secondary_categories: ['Arts & culture'], urgency: 'low', description: 'Photograph adoptable pets for the shelter website.', required_skills: ['Photography'], preferred_skills: ['Social media'], schedule_slots: ['wkend_afternoon'], capacity: 2, min_age: 16, hours_per_session: 2, location: 'Paws & Whiskers Shelter' },
];

export const DEMO_VOLUNTEERS = [
  { key: 'jordan', display_name: 'Jordan (demo)', age_band: '21_plus', background_check: false, skills: ['Food handling', 'Heavy lifting', 'Driving'], availability: ['wkend_morning', 'wkend_afternoon'], interests: ['Food security', 'Environment'] },
  { key: 'priya', display_name: 'Priya (demo)', age_band: '21_plus', background_check: true, skills: ['Tutoring', 'Mentoring', 'Public speaking'], availability: ['wkday_afternoon', 'wkday_evening'], interests: ['Education'] },
  { key: 'sam', display_name: 'Sam (demo, age 16–17)', age_band: '16_17', background_check: false, skills: ['Gardening', 'Photography', 'Social media'], availability: ['wkend_morning', 'wkend_afternoon'], interests: ['Environment', 'Animals'] },
  { key: 'lee', display_name: 'Lee (demo)', age_band: '21_plus', background_check: false, skills: ['Tech support', 'Translation (Mandarin)', 'Elder companionship'], availability: ['wkday_morning', 'wkday_afternoon'], interests: ['Seniors', 'Digital access'] },
  { key: 'maya', display_name: 'Maya (demo, age 14–15)', age_band: '14_15', background_check: false, skills: ['Public speaking'], availability: ['wkday_afternoon', 'wkend_morning'], interests: ['Education', 'Environment'] },
];

export const DEMO_ASSIGNMENTS = [
  { volunteer: 'jordan', opportunity: 'sort', status: 'interested' },
  { volunteer: 'priya', opportunity: 'tutor', status: 'interested' },
  { volunteer: 'sam', opportunity: 'cleanup', status: 'interested' },
  { volunteer: 'lee', opportunity: 'techhelp', status: 'confirmed', org_note: 'Welcome! Check in at the front desk on your first visit.' },
];

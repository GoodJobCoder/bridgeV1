// All tunable numbers for the matching algorithm live here.
// The three maximums must add up to 100 so the total reads as "points out of 100".

export const WEIGHTS = {
  skills: 45,
  availability: 35,
  interests: 20,
};

// Inside the skills component, a required skill counts twice as much as a preferred one.
export const SKILL_WEIGHT = {
  required: 2,
  preferred: 1,
};

// Inside the interests component: share of the 20 points earned by each kind of match.
export const INTEREST_SHARE = {
  primaryCategory: 1.0,
  secondaryCategory: 0.5,
};

export const MAX_SCORE = WEIGHTS.skills + WEIGHTS.availability + WEIGHTS.interests;

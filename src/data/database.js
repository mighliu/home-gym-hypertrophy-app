export const EXERCISE_DB = {
  "Incline Push": {
    rr: "8-10",
    exercises: [
      "Incline Barbell Bench Press",
      "Incline Dumbbell Bench Press",
      "Gymnastic Ring Push-Ups (Feet Elevated)",
      "Low-Incline Dumbbell Press"
    ]
  },
  "Chest Isolation": {
    rr: "10-12",
    exercises: [
      "Gymnastic Ring Flyes",
      "Flat Dumbbell Flyes",
      "Dumbbell Floor Flyes",
      "Dumbbell Pullover",
      "Incline Dumbbell Flyes"
    ]
  },
  "Horizontal Push": {
    rr: "8-10",
    exercises: [
      "Flat Barbell Bench Press",
      "Flat Dumbbell Bench Press",
      "Weighted Floor Press (Barbell)",
      "Weighted Floor Press (Dumbbell)",
      "Close-Grip Barbell Bench Press"
    ]
  },
  "Horizontal Pull": {
    rr: "8-12",
    exercises: [
      "Barbell Bent Over Row",
      "One-Arm Dumbbell Row",
      "Gymnastic Ring Inverted Rows",
      "Barbell Pendlay Row",
      "Dumbbell Seal Row (on Incline Bench)",
      "Chest-Supported Dumbbell Row"
    ]
  },
  "Vertical Pull": {
    rr: "6-10",
    exercises: [
      "Band-Assisted Pull-Ups (on Rack Bar)",
      "Band-Assisted Chin-Ups (on Rack Bar)",
      "Negative Pull-Ups (Slow Eccentric)",
      "Gymnastic Ring Rows (Vertical Lean)",
      "Neutral Grip Pull-Ups (on Rack Bar)"
    ]
  },
  "Side Delts": {
    rr: "12-15",
    exercises: [
      "Dumbbell Side Lateral Raise",
      "Band Side Lateral Raise",
      "Dumbbell Leaning Lateral Raise",
      "Dumbbell Lu Raise"
    ]
  },
  "Rear Delts": {
    rr: "15-20",
    exercises: [
      "Band Face Pulls (Anchored to Rack)",
      "Dumbbell Rear Delt Flye",
      "Incline Bench Dumbbell Rear Flye",
      "Band Pull-Aparts"
    ]
  },
  "Quads": {
    rr: "6-8",
    exercises: [
      "High Bar Barbell Squat",
      "Barbell Front Squat",
      "Barbell Box Squats",
      "Barbell Pause Squat",
      "Barbell Pin Squat (from Rack)"
    ]
  },
  "Quads (Unilateral)": {
    rr: "8-10",
    exercises: [
      "Dumbbell Bulgarian Split Squat",
      "Dumbbell Walking Lunges",
      "Dumbbell Step-Ups (on Bench)",
      "Kettlebell Goblet Squat",
      "Barbell Reverse Lunge",
      "Dumbbell Goblet Squat"
    ]
  },
  "Glutes/Hams (Hinge)": {
    rr: "5-7",
    exercises: [
      "Conventional Barbell Deadlift",
      "Barbell Sumo Deadlift",
      "Barbell Deficit Deadlift"
    ]
  },
  "Hamstring Hinge": {
    rr: "6-8",
    exercises: [
      "Barbell Romanian Deadlift",
      "Dumbbell Romanian Deadlift",
      "Barbell Stiff-Leg Deadlift",
      "Barbell Good Mornings",
      "Kettlebell Romanian Deadlift",
      "Dumbbell Single-Leg RDL"
    ]
  },
  "Hamstring Isolation": {
    rr: "12-15",
    exercises: [
      "Band-Resisted Lying Leg Curls",
      "Dumbbell Lying Leg Curl (on Bench)",
      "Nordic Curl (Band-Assisted)",
      "Slider Leg Curl"
    ]
  },
  "Front Delts / OHP": {
    rr: "8-10",
    exercises: [
      "Standing Barbell Overhead Press",
      "Seated Dumbbell Shoulder Press",
      "Dumbbell Arnold Press",
      "Z-Press (Seated Floor BB Press)"
    ]
  },
  "Biceps": {
    rr: "10-12",
    exercises: [
      "EZ Bar Biceps Curl",
      "Dumbbell Incline Curl",
      "Dumbbell Hammer Curl",
      "Barbell Curl",
      "Dumbbell Concentration Curl",
      "EZ Bar Spider Curl (on Incline Bench)"
    ]
  },
  "Triceps": {
    rr: "10-12",
    exercises: [
      "EZ Bar Overhead Tricep Extension",
      "Dumbbell Lying Triceps Extension",
      "Gymnastic Ring Triceps Extensions",
      "Dumbbell OH Triceps Extension",
      "Close-Grip Push-Ups",
      "Band Triceps Pushdown (Anchored High)"
    ]
  },
  "Calves": {
    rr: "12-15",
    exercises: [
      "Standing Barbell Calf Raise (in Rack)",
      "Seated Dumbbell Calf Raise",
      "Bodyweight Single-Leg Calf Raise",
      "Kettlebell Calf Raise"
    ]
  },
  "Abs": {
    rr: "10-12",
    exercises: [
      "Hanging Ring Knee Raises",
      "Hanging Knee Raise (on Power Rack)",
      "Weighted Crunch (with Dumbbell)",
      "Hanging Leg Raise (on Power Rack)",
      "Ab Wheel Rollout",
      "Band Pallof Press",
      "Dumbbell Suitcase Carry",
      "Dumbbell Side Bend"
    ]
  },
  "Traps": {
    rr: "10-12",
    exercises: [
      "Barbell Shrug",
      "Dumbbell Shrug",
      "Kettlebell Shrug",
      "Barbell Behind-the-Back Shrug"
    ]
  },
  "Forearms": {
    rr: "12-15",
    exercises: [
      "Barbell Wrist Curl",
      "Dumbbell Wrist Curl",
      "Farmer's Walk (Dumbbells)",
      "Dumbbell Suitcase Carry",
      "Kettlebell Farmer's Walk"
    ]
  }
};

export const COMPOUND_PATTERNS = [
  "Incline Push",
  "Horizontal Push",
  "Horizontal Pull",
  "Vertical Pull",
  "Quads",
  "Quads (Unilateral)",
  "Glutes/Hams (Hinge)",
  "Hamstring Hinge",
  "Front Delts / OHP"
];

export function getEquipmentProfile(exName) {
  if (!exName) return { equip: "BW", barWeight: 0, divisor: 1, isWeighted: false };
  const name = exName.toLowerCase();
  if (name.includes("ez")) {
    return { equip: "EZ", barWeight: 14, divisor: 2, isWeighted: true };
  } else if (name.includes("dumbbell") || name.includes("db") || name.includes("dumbbells")) {
    return { equip: "DB", barWeight: 12, divisor: 2, isWeighted: true };
  } else if (name.includes("barbell") || name.includes("bb")) {
    return { equip: "BB", barWeight: 45, divisor: 2, isWeighted: true };
  } else if (name.includes("kettlebell") || name.includes("kb")) {
    return { equip: "KB", barWeight: 0, divisor: 1, isWeighted: true };
  } else if (name.includes("band")) {
    return { equip: "Band", barWeight: 0, divisor: 1, isWeighted: false };
  } else if (name.includes("ring")) {
    return { equip: "Ring", barWeight: 0, divisor: 1, isWeighted: false };
  } else {
    return { equip: "BW", barWeight: 0, divisor: 1, isWeighted: false };
  }
}

export const WEEKS = [
  { label: "Week 1 — Accumulation", setsComp: 3, setsIso: 2, rir: "3 RIR", weightPct: 0.88, isDeload: false },
  { label: "Week 2 — Accumulation", setsComp: 3, setsIso: 2, rir: "2 RIR", weightPct: 0.91, isDeload: false },
  { label: "Week 3 — Intensification", setsComp: 3, setsIso: 3, rir: "1 RIR", weightPct: 0.94, isDeload: false },
  { label: "Week 4 — Overreach", setsComp: 4, setsIso: 3, rir: "0 RIR", weightPct: 0.97, isDeload: false },
  { label: "Week 5 — Deload", setsComp: 2, setsIso: 2, rir: "Deload (4+ RIR)", weightPct: 0.65, isDeload: true }
];

export const DEFAULT_SPLITS = {
  1: [
    {
      title: "Upper Body — Day 1 (Push Emphasis + Pull Balance)",
      exercises: [
        { pattern: "Incline Push", exercise: "Incline Barbell Bench Press", rack: "-", baseline: 135, tempo: "3-1-1-0", ss: "" },
        { pattern: "Horizontal Pull", exercise: "Barbell Bent Over Row", rack: "-", baseline: 135, tempo: "3-1-1-0", ss: "" },
        { pattern: "Vertical Pull", exercise: "Band-Assisted Pull-Ups (on Rack Bar)", rack: "Black Band", baseline: 0, tempo: "2-1-2-0", ss: "" },
        { pattern: "Chest Isolation", exercise: "Gymnastic Ring Flyes", rack: "Strap Pin #10", baseline: 0, tempo: "3-1-2-1", ss: "" },
        { pattern: "Side Delts", exercise: "Dumbbell Side Lateral Raise", rack: "-", baseline: 15, tempo: "3-1-2-1", ss: "A1" },
        { pattern: "Rear Delts", exercise: "Band Face Pulls (Anchored to Rack)", rack: "Red Band", baseline: 0, tempo: "2-1-2-0", ss: "A2" },
        { pattern: "Biceps", exercise: "EZ Bar Biceps Curl", rack: "-", baseline: 45, tempo: "3-1-2-1", ss: "B1" },
        { pattern: "Abs", exercise: "Hanging Ring Knee Raises", rack: "Strap Pin #4", baseline: 0, tempo: "2-1-2-1", ss: "B2" }
      ]
    },
    {
      title: "Lower Body — Day 2 (Quad Emphasis)",
      exercises: [
        { pattern: "Quads", exercise: "High Bar Barbell Squat", rack: "Safety Pin #6", baseline: 185, tempo: "3-1-1-0", ss: "" },
        { pattern: "Quads (Unilateral)", exercise: "Dumbbell Bulgarian Split Squat", rack: "-", baseline: 30, tempo: "3-1-1-0", ss: "" },
        { pattern: "Hamstring Isolation", exercise: "Band-Resisted Lying Leg Curls", rack: "Purple Band", baseline: 0, tempo: "3-1-2-1", ss: "A1" },
        { pattern: "Calves", exercise: "Standing Barbell Calf Raise (in Rack)", rack: "Safety Pin #12", baseline: 135, tempo: "3-2-1-1", ss: "A2" },
        { pattern: "Triceps", exercise: "EZ Bar Overhead Tricep Extension", rack: "-", baseline: 45, tempo: "3-1-2-1", ss: "" }
      ]
    },
    {
      title: "Upper Body — Day 3 (Pull Emphasis)",
      exercises: [
        { pattern: "Vertical Pull", exercise: "Band-Assisted Pull-Ups (on Rack Bar)", rack: "Purple Band", baseline: 0, tempo: "2-1-2-0", ss: "" },
        { pattern: "Horizontal Pull", exercise: "One-Arm Dumbbell Row", rack: "-", baseline: 50, tempo: "3-1-1-0", ss: "" },
        { pattern: "Horizontal Push", exercise: "Flat Dumbbell Bench Press", rack: "-", baseline: 50, tempo: "3-1-1-0", ss: "" },
        { pattern: "Front Delts / OHP", exercise: "Standing Barbell Overhead Press", rack: "-", baseline: 95, tempo: "3-1-1-0", ss: "" },
        { pattern: "Side Delts", exercise: "Dumbbell Leaning Lateral Raise", rack: "-", baseline: 12, tempo: "3-1-2-1", ss: "A1" },
        { pattern: "Rear Delts", exercise: "Dumbbell Rear Delt Flye", rack: "-", baseline: 10, tempo: "3-1-2-1", ss: "A2" },
        { pattern: "Biceps", exercise: "Dumbbell Hammer Curl", rack: "-", baseline: 20, tempo: "3-1-2-1", ss: "B1" },
        { pattern: "Triceps", exercise: "Gymnastic Ring Triceps Extensions", rack: "Strap Pin #8", baseline: 0, tempo: "3-1-2-1", ss: "B2" },
        { pattern: "Abs", exercise: "Hanging Knee Raise (on Power Rack)", rack: "-", baseline: 0, tempo: "2-1-2-1", ss: "" }
      ]
    },
    {
      title: "Lower Body — Day 4 (Posterior Chain Emphasis)",
      exercises: [
        { pattern: "Glutes/Hams (Hinge)", exercise: "Conventional Barbell Deadlift", rack: "Floor Pull", baseline: 225, tempo: "3-1-1-0", ss: "" },
        { pattern: "Hamstring Hinge", exercise: "Barbell Romanian Deadlift", rack: "-", baseline: 155, tempo: "3-1-1-0", ss: "" },
        { pattern: "Quads (Unilateral)", exercise: "Kettlebell Goblet Squat", rack: "-", baseline: 35, tempo: "3-1-1-0", ss: "" },
        { pattern: "Hamstring Isolation", exercise: "Dumbbell Lying Leg Curl (on Bench)", rack: "-", baseline: 10, tempo: "3-1-2-1", ss: "A1" },
        { pattern: "Calves", exercise: "Seated Dumbbell Calf Raise", rack: "-", baseline: 30, tempo: "3-2-1-1", ss: "A2" },
        { pattern: "Traps", exercise: "Barbell Shrug", rack: "-", baseline: 155, tempo: "2-1-1-1", ss: "" }
      ]
    }
  ],
  2: [
    {
      title: "Upper Body — Day 1 (Push Emphasis + Pull Balance)",
      exercises: [
        { pattern: "Incline Push", exercise: "Incline Dumbbell Bench Press", rack: "-", baseline: 45, tempo: "3-1-1-0", ss: "" },
        { pattern: "Horizontal Pull", exercise: "Barbell Pendlay Row", rack: "-", baseline: 135, tempo: "1-1-1-0", ss: "" },
        { pattern: "Vertical Pull", exercise: "Band-Assisted Pull-Ups (on Rack Bar)", rack: "Black Band", baseline: 0, tempo: "2-1-2-0", ss: "" },
        { pattern: "Chest Isolation", exercise: "Flat Dumbbell Flyes", rack: "-", baseline: 20, tempo: "3-1-2-1", ss: "" },
        { pattern: "Side Delts", exercise: "Dumbbell Leaning Lateral Raise", rack: "-", baseline: 12, tempo: "3-1-2-1", ss: "A1" },
        { pattern: "Rear Delts", exercise: "Band Pull-Aparts", rack: "Red Band", baseline: 0, tempo: "2-1-2-0", ss: "A2" },
        { pattern: "Biceps", exercise: "Dumbbell Incline Curl", rack: "-", baseline: 15, tempo: "3-1-2-1", ss: "B1" },
        { pattern: "Abs", exercise: "Weighted Crunch (with Dumbbell)", rack: "-", baseline: 20, tempo: "2-1-2-1", ss: "B2" }
      ]
    },
    {
      title: "Lower Body — Day 2 (Quad Emphasis)",
      exercises: [
        { pattern: "Quads", exercise: "High Bar Barbell Squat", rack: "Safety Pin #6", baseline: 185, tempo: "3-1-1-0", ss: "" },
        { pattern: "Quads (Unilateral)", exercise: "Dumbbell Walking Lunges", rack: "-", baseline: 25, tempo: "3-1-1-0", ss: "" },
        { pattern: "Hamstring Isolation", exercise: "Dumbbell Lying Leg Curl (on Bench)", rack: "-", baseline: 10, tempo: "3-1-2-1", ss: "A1" },
        { pattern: "Calves", exercise: "Standing Barbell Calf Raise (in Rack)", rack: "Safety Pin #12", baseline: 145, tempo: "3-2-1-1", ss: "A2" },
        { pattern: "Triceps", exercise: "Dumbbell Lying Triceps Extension", rack: "-", baseline: 20, tempo: "3-1-2-1", ss: "" }
      ]
    },
    {
      title: "Upper Body — Day 3 (Pull Emphasis)",
      exercises: [
        { pattern: "Vertical Pull", exercise: "Band-Assisted Chin-Ups (on Rack Bar)", rack: "Purple Band", baseline: 0, tempo: "2-1-2-0", ss: "" },
        { pattern: "Horizontal Pull", exercise: "One-Arm Dumbbell Row", rack: "-", baseline: 55, tempo: "3-1-1-0", ss: "" },
        { pattern: "Horizontal Push", exercise: "Weighted Floor Press (Dumbbell)", rack: "-", baseline: 50, tempo: "3-1-1-0", ss: "" },
        { pattern: "Front Delts / OHP", exercise: "Seated Dumbbell Shoulder Press", rack: "-", baseline: 35, tempo: "3-1-1-0", ss: "" },
        { pattern: "Side Delts", exercise: "Dumbbell Side Lateral Raise", rack: "-", baseline: 15, tempo: "3-1-2-1", ss: "A1" },
        { pattern: "Rear Delts", exercise: "Incline Bench Dumbbell Rear Flye", rack: "-", baseline: 10, tempo: "3-1-2-1", ss: "A2" },
        { pattern: "Biceps", exercise: "EZ Bar Spider Curl (on Incline Bench)", rack: "-", baseline: 35, tempo: "3-1-2-1", ss: "B1" },
        { pattern: "Triceps", exercise: "Band Triceps Pushdown (Anchored High)", rack: "Black Band", baseline: 0, tempo: "2-1-2-0", ss: "B2" },
        { pattern: "Abs", exercise: "Hanging Leg Raise (on Power Rack)", rack: "-", baseline: 0, tempo: "2-1-2-1", ss: "" }
      ]
    },
    {
      title: "Lower Body — Day 4 (Posterior Chain Emphasis)",
      exercises: [
        { pattern: "Glutes/Hams (Hinge)", exercise: "Conventional Barbell Deadlift", rack: "Floor Pull", baseline: 235, tempo: "3-1-1-0", ss: "" },
        { pattern: "Hamstring Hinge", exercise: "Dumbbell Romanian Deadlift", rack: "-", baseline: 45, tempo: "3-1-1-0", ss: "" },
        { pattern: "Quads (Unilateral)", exercise: "Dumbbell Goblet Squat", rack: "-", baseline: 40, tempo: "3-1-1-0", ss: "" },
        { pattern: "Hamstring Isolation", exercise: "Nordic Curl (Band-Assisted)", rack: "Red Band", baseline: 0, tempo: "4-0-1-0", ss: "A1" },
        { pattern: "Calves", exercise: "Bodyweight Single-Leg Calf Raise", rack: "-", baseline: 0, tempo: "3-2-1-1", ss: "A2" },
        { pattern: "Traps", exercise: "Dumbbell Shrug", rack: "-", baseline: 50, tempo: "2-1-1-1", ss: "" }
      ]
    }
  ],
  3: [
    {
      title: "Upper Body — Day 1 (Push Emphasis + Pull Balance)",
      exercises: [
        { pattern: "Incline Push", exercise: "Low-Incline Dumbbell Press", rack: "-", baseline: 50, tempo: "3-1-1-0", ss: "" },
        { pattern: "Horizontal Pull", exercise: "Chest-Supported Dumbbell Row", rack: "-", baseline: 35, tempo: "3-1-1-0", ss: "" },
        { pattern: "Vertical Pull", exercise: "Band-Assisted Pull-Ups (on Rack Bar)", rack: "Red Band", baseline: 0, tempo: "2-1-2-0", ss: "" },
        { pattern: "Chest Isolation", exercise: "Dumbbell Pullover", rack: "-", baseline: 35, tempo: "3-1-2-1", ss: "" },
        { pattern: "Side Delts", exercise: "Dumbbell Lu Raise", rack: "-", baseline: 10, tempo: "3-1-2-1", ss: "A1" },
        { pattern: "Rear Delts", exercise: "Dumbbell Rear Delt Flye", rack: "-", baseline: 12, tempo: "3-1-2-1", ss: "A2" },
        { pattern: "Biceps", exercise: "Barbell Curl", rack: "-", baseline: 65, tempo: "3-1-2-1", ss: "B1" },
        { pattern: "Abs", exercise: "Hanging Leg Raise (on Power Rack)", rack: "-", baseline: 0, tempo: "2-1-2-1", ss: "B2" }
      ]
    },
    {
      title: "Lower Body — Day 2 (Quad Emphasis)",
      exercises: [
        { pattern: "Quads", exercise: "Barbell Pause Squat", rack: "Safety Pin #6", baseline: 165, tempo: "3-2-1-0", ss: "" },
        { pattern: "Quads (Unilateral)", exercise: "Dumbbell Step-Ups (on Bench)", rack: "-", baseline: 30, tempo: "2-1-1-0", ss: "" },
        { pattern: "Hamstring Isolation", exercise: "Band-Resisted Lying Leg Curls", rack: "Purple Band", baseline: 0, tempo: "3-1-2-1", ss: "A1" },
        { pattern: "Calves", exercise: "Seated Dumbbell Calf Raise", rack: "-", baseline: 35, tempo: "3-2-1-1", ss: "A2" },
        { pattern: "Triceps", exercise: "Close-Grip Push-Ups", rack: "-", baseline: 0, tempo: "3-1-1-0", ss: "" }
      ]
    },
    {
      title: "Upper Body — Day 3 (Pull Emphasis)",
      exercises: [
        { pattern: "Vertical Pull", exercise: "Neutral Grip Pull-Ups (on Rack Bar)", rack: "Purple Band", baseline: 0, tempo: "2-1-2-0", ss: "" },
        { pattern: "Horizontal Pull", exercise: "One-Arm Dumbbell Row", rack: "-", baseline: 60, tempo: "3-1-1-0", ss: "" },
        { pattern: "Horizontal Push", exercise: "Close-Grip Barbell Bench Press", rack: "-", baseline: 115, tempo: "3-1-1-0", ss: "" },
        { pattern: "Front Delts / OHP", exercise: "Dumbbell Arnold Press", rack: "-", baseline: 30, tempo: "3-1-1-0", ss: "" },
        { pattern: "Side Delts", exercise: "Band Side Lateral Raise", rack: "-", baseline: 0, tempo: "3-1-2-1", ss: "A1" },
        { pattern: "Rear Delts", exercise: "Band Face Pulls (Anchored to Rack)", rack: "Red Band", baseline: 0, tempo: "2-1-2-0", ss: "A2" },
        { pattern: "Biceps", exercise: "Dumbbell Concentration Curl", rack: "-", baseline: 15, tempo: "3-1-2-1", ss: "B1" },
        { pattern: "Triceps", exercise: "Dumbbell OH Triceps Extension", rack: "-", baseline: 25, tempo: "3-1-2-1", ss: "B2" },
        { pattern: "Abs", exercise: "Weighted Crunch (with Dumbbell)", rack: "-", baseline: 25, tempo: "2-1-2-1", ss: "" }
      ]
    },
    {
      title: "Lower Body — Day 4 (Posterior Chain Emphasis)",
      exercises: [
        { pattern: "Glutes/Hams (Hinge)", exercise: "Barbell Deficit Deadlift", rack: "Floor Pull", baseline: 205, tempo: "3-1-1-0", ss: "" },
        { pattern: "Hamstring Hinge", exercise: "Barbell Stiff-Leg Deadlift", rack: "-", baseline: 145, tempo: "3-1-1-0", ss: "" },
        { pattern: "Quads (Unilateral)", exercise: "Barbell Reverse Lunge", rack: "Safety Pin #6", baseline: 115, tempo: "3-1-1-0", ss: "" },
        { pattern: "Hamstring Isolation", exercise: "Slider Leg Curl", rack: "-", baseline: 0, tempo: "4-1-2-0", ss: "A1" },
        { pattern: "Calves", exercise: "Kettlebell Calf Raise", rack: "-", baseline: 35, tempo: "3-2-1-1", ss: "A2" },
        { pattern: "Traps", exercise: "Barbell Behind-the-Back Shrug", rack: "-", baseline: 155, tempo: "2-1-1-1", ss: "" }
      ]
    }
  ]
};

export const EXERCISE_MUSCLES = {
  // Incline Push
  "Incline Barbell Bench Press": { primary: ["Chest"], secondary: ["Shoulders", "Triceps"] },
  "Incline Dumbbell Bench Press": { primary: ["Chest"], secondary: ["Shoulders", "Triceps"] },
  "Gymnastic Ring Push-Ups (Feet Elevated)": { primary: ["Chest"], secondary: ["Shoulders", "Triceps", "Abs"] },
  "Low-Incline Dumbbell Press": { primary: ["Chest"], secondary: ["Shoulders", "Triceps"] },

  // Chest Isolation
  "Gymnastic Ring Flyes": { primary: ["Chest"], secondary: ["Shoulders"] },
  "Flat Dumbbell Flyes": { primary: ["Chest"], secondary: ["Shoulders"] },
  "Dumbbell Floor Flyes": { primary: ["Chest"], secondary: ["Shoulders"] },
  "Dumbbell Pullover": { primary: ["Chest", "Back"], secondary: ["Triceps"] },
  "Incline Dumbbell Flyes": { primary: ["Chest"], secondary: ["Shoulders"] },

  // Horizontal Push
  "Flat Barbell Bench Press": { primary: ["Chest"], secondary: ["Shoulders", "Triceps"] },
  "Flat Dumbbell Bench Press": { primary: ["Chest"], secondary: ["Shoulders", "Triceps"] },
  "Weighted Floor Press (Barbell)": { primary: ["Chest"], secondary: ["Triceps", "Shoulders"] },
  "Weighted Floor Press (Dumbbell)": { primary: ["Chest"], secondary: ["Triceps", "Shoulders"] },
  "Close-Grip Barbell Bench Press": { primary: ["Triceps", "Chest"], secondary: ["Shoulders"] },

  // Horizontal Pull
  "Barbell Bent Over Row": { primary: ["Back"], secondary: ["Biceps", "Rear Delts", "Traps"] },
  "One-Arm Dumbbell Row": { primary: ["Back"], secondary: ["Biceps", "Rear Delts"] },
  "Gymnastic Ring Inverted Rows": { primary: ["Back"], secondary: ["Biceps", "Rear Delts", "Abs"] },
  "Barbell Pendlay Row": { primary: ["Back"], secondary: ["Biceps", "Rear Delts"] },
  "Dumbbell Seal Row (on Incline Bench)": { primary: ["Back"], secondary: ["Biceps", "Rear Delts", "Traps"] },
  "Chest-Supported Dumbbell Row": { primary: ["Back"], secondary: ["Biceps", "Rear Delts"] },

  // Vertical Pull
  "Band-Assisted Pull-Ups (on Rack Bar)": { primary: ["Back"], secondary: ["Biceps", "Rear Delts"] },
  "Band-Assisted Chin-Ups (on Rack Bar)": { primary: ["Back", "Biceps"], secondary: ["Rear Delts"] },
  "Negative Pull-Ups (Slow Eccentric)": { primary: ["Back"], secondary: ["Biceps", "Rear Delts"] },
  "Gymnastic Ring Rows (Vertical Lean)": { primary: ["Back"], secondary: ["Biceps", "Rear Delts"] },
  "Neutral Grip Pull-Ups (on Rack Bar)": { primary: ["Back"], secondary: ["Biceps", "Rear Delts"] },

  // Side Delts
  "Dumbbell Side Lateral Raise": { primary: ["Shoulders"], secondary: [] },
  "Band Side Lateral Raise": { primary: ["Shoulders"], secondary: [] },
  "Dumbbell Leaning Lateral Raise": { primary: ["Shoulders"], secondary: [] },
  "Dumbbell Lu Raise": { primary: ["Shoulders"], secondary: ["Traps"] },

  // Rear Delts
  "Band Face Pulls (Anchored to Rack)": { primary: ["Shoulders"], secondary: ["Traps", "Back"] },
  "Dumbbell Rear Delt Flye": { primary: ["Shoulders"], secondary: [] },
  "Incline Bench Dumbbell Rear Flye": { primary: ["Shoulders"], secondary: [] },
  "Band Pull-Aparts": { primary: ["Shoulders"], secondary: ["Traps"] },

  // Quads
  "High Bar Barbell Squat": { primary: ["Quads"], secondary: ["Glutes", "Hamstrings"] },
  "Barbell Front Squat": { primary: ["Quads"], secondary: ["Glutes", "Hamstrings"] },
  "Barbell Box Squats": { primary: ["Quads", "Glutes"], secondary: ["Hamstrings"] },
  "Barbell Pause Squat": { primary: ["Quads"], secondary: ["Glutes", "Hamstrings"] },
  "Barbell Pin Squat (from Rack)": { primary: ["Quads"], secondary: ["Glutes", "Hamstrings"] },

  // Quads (Unilateral)
  "Dumbbell Bulgarian Split Squat": { primary: ["Quads", "Glutes"], secondary: ["Hamstrings"] },
  "Dumbbell Walking Lunges": { primary: ["Quads", "Glutes"], secondary: ["Hamstrings"] },
  "Dumbbell Step-Ups (on Bench)": { primary: ["Quads", "Glutes"], secondary: ["Hamstrings"] },
  "Kettlebell Goblet Squat": { primary: ["Quads"], secondary: ["Glutes", "Hamstrings"] },
  "Barbell Reverse Lunge": { primary: ["Quads", "Glutes"], secondary: ["Hamstrings"] },
  "Dumbbell Goblet Squat": { primary: ["Quads"], secondary: ["Glutes", "Hamstrings"] },

  // Glutes/Hams (Hinge)
  "Conventional Barbell Deadlift": { primary: ["Hamstrings", "Glutes"], secondary: ["Back", "Traps"] },
  "Barbell Sumo Deadlift": { primary: ["Hamstrings", "Glutes"], secondary: ["Quads", "Back"] },
  "Barbell Deficit Deadlift": { primary: ["Hamstrings", "Glutes"], secondary: ["Back", "Traps"] },

  // Hamstring Hinge
  "Barbell Romanian Deadlift": { primary: ["Hamstrings", "Glutes"], secondary: ["Back"] },
  "Dumbbell Romanian Deadlift": { primary: ["Hamstrings", "Glutes"], secondary: ["Back"] },
  "Barbell Stiff-Leg Deadlift": { primary: ["Hamstrings"], secondary: ["Glutes", "Back"] },
  "Barbell Good Mornings": { primary: ["Hamstrings", "Glutes"], secondary: ["Back"] },
  "Kettlebell Romanian Deadlift": { primary: ["Hamstrings", "Glutes"], secondary: ["Back"] },
  "Dumbbell Single-Leg RDL": { primary: ["Hamstrings", "Glutes"], secondary: ["Back"] },

  // Hamstring Isolation
  "Band-Resisted Lying Leg Curls": { primary: ["Hamstrings"], secondary: [] },
  "Dumbbell Lying Leg Curl (on Bench)": { primary: ["Hamstrings"], secondary: [] },
  "Nordic Curl (Band-Assisted)": { primary: ["Hamstrings"], secondary: ["Glutes"] },
  "Slider Leg Curl": { primary: ["Hamstrings"], secondary: ["Glutes"] },

  // Front Delts / OHP
  "Standing Barbell Overhead Press": { primary: ["Shoulders"], secondary: ["Triceps"] },
  "Seated Dumbbell Shoulder Press": { primary: ["Shoulders"], secondary: ["Triceps"] },
  "Dumbbell Arnold Press": { primary: ["Shoulders"], secondary: ["Triceps"] },
  "Z-Press (Seated Floor BB Press)": { primary: ["Shoulders"], secondary: ["Triceps", "Abs"] },

  // Biceps
  "EZ Bar Biceps Curl": { primary: ["Biceps"], secondary: ["Forearms"] },
  "Dumbbell Incline Curl": { primary: ["Biceps"], secondary: ["Forearms"] },
  "Dumbbell Hammer Curl": { primary: ["Biceps", "Forearms"], secondary: [] },
  "Barbell Curl": { primary: ["Biceps"], secondary: ["Forearms"] },
  "Dumbbell Concentration Curl": { primary: ["Biceps"], secondary: [] },
  "EZ Bar Spider Curl (on Incline Bench)": { primary: ["Biceps"], secondary: [] },

  // Triceps
  "EZ Bar Overhead Tricep Extension": { primary: ["Triceps"], secondary: [] },
  "Dumbbell Lying Triceps Extension": { primary: ["Triceps"], secondary: [] },
  "Gymnastic Ring Triceps Extensions": { primary: ["Triceps"], secondary: ["Abs"] },
  "Dumbbell OH Triceps Extension": { primary: ["Triceps"], secondary: [] },
  "Close-Grip Push-Ups": { primary: ["Triceps", "Chest"], secondary: ["Shoulders"] },
  "Band Triceps Pushdown (Anchored High)": { primary: ["Triceps"], secondary: [] },

  // Calves
  "Standing Barbell Calf Raise (in Rack)": { primary: ["Calves"], secondary: [] },
  "Seated Dumbbell Calf Raise": { primary: ["Calves"], secondary: [] },
  "Bodyweight Single-Leg Calf Raise": { primary: ["Calves"], secondary: [] },
  "Kettlebell Calf Raise": { primary: ["Calves"], secondary: [] },

  // Abs
  "Hanging Ring Knee Raises": { primary: ["Abs"], secondary: [] },
  "Hanging Knee Raise (on Power Rack)": { primary: ["Abs"], secondary: [] },
  "Weighted Crunch (with Dumbbell)": { primary: ["Abs"], secondary: [] },
  "Hanging Leg Raise (on Power Rack)": { primary: ["Abs"], secondary: [] },
  "Ab Wheel Rollout": { primary: ["Abs"], secondary: ["Shoulders"] },
  "Band Pallof Press": { primary: ["Abs"], secondary: ["Shoulders"] },
  "Dumbbell Suitcase Carry": { primary: ["Abs", "Forearms"], secondary: ["Traps"] },
  "Dumbbell Side Bend": { primary: ["Abs"], secondary: [] },

  // Traps
  "Barbell Shrug": { primary: ["Traps"], secondary: [] },
  "Dumbbell Shrug": { primary: ["Traps"], secondary: [] },
  "Kettlebell Shrug": { primary: ["Traps"], secondary: [] },
  "Barbell Behind-the-Back Shrug": { primary: ["Traps"], secondary: [] },

  // Forearms
  "Barbell Wrist Curl": { primary: ["Forearms"], secondary: [] },
  "Dumbbell Wrist Curl": { primary: ["Forearms"], secondary: [] },
  "Farmer's Walk (Dumbbells)": { primary: ["Forearms"], secondary: ["Traps"] },
  "Kettlebell Farmer's Walk": { primary: ["Forearms"], secondary: ["Traps"] }
};

export const getExerciseMuscleSimilarity = (exName1, exName2) => {
  if (!exName1 || !exName2) return 0;
  if (exName1 === exName2) return 100;
  
  const m1 = EXERCISE_MUSCLES[exName1] || { primary: [], secondary: [] };
  const m2 = EXERCISE_MUSCLES[exName2] || { primary: [], secondary: [] };

  const prim1 = new Set(m1.primary || []);
  const sec1 = new Set(m1.secondary || []);
  const prim2 = new Set(m2.primary || []);
  const sec2 = new Set(m2.secondary || []);

  if (prim1.size === 0 && prim2.size === 0) return 0;

  let score = 0;
  let totalMax = 0;

  prim1.forEach(m => {
    totalMax += 1.0;
    if (prim2.has(m)) {
      score += 1.0;
    } else if (sec2.has(m)) {
      score += 0.5;
    }
  });

  sec1.forEach(m => {
    totalMax += 0.5;
    if (prim2.has(m)) {
      score += 0.5;
    } else if (sec2.has(m)) {
      score += 0.3;
    }
  });

  prim2.forEach(m => {
    if (!prim1.has(m) && !sec1.has(m)) {
      totalMax += 0.5;
    }
  });

  const finalPct = Math.round((score / Math.max(1, totalMax)) * 100);
  return Math.min(100, Math.max(10, finalPct));
};


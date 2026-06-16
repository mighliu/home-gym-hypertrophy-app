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
        { pattern: "Rear Delts", exercise: "Dumbbell Rear Delt Flye", rack: "-", baseline: 10, tempo: "3-1-2-1", ss: "A1" },
        { pattern: "Abs", exercise: "Hanging Knee Raise (on Power Rack)", rack: "-", baseline: 0, tempo: "2-1-2-1", ss: "A2" },
        { pattern: "Biceps", exercise: "Dumbbell Hammer Curl", rack: "-", baseline: 20, tempo: "3-1-2-1", ss: "B1" },
        { pattern: "Triceps", exercise: "Gymnastic Ring Triceps Extensions", rack: "Strap Pin #8", baseline: 0, tempo: "3-1-2-1", ss: "B2" }
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
        { pattern: "Rear Delts", exercise: "Incline Bench Dumbbell Rear Flye", rack: "-", baseline: 10, tempo: "3-1-2-1", ss: "A1" },
        { pattern: "Abs", exercise: "Hanging Leg Raise (on Power Rack)", rack: "-", baseline: 0, tempo: "2-1-2-1", ss: "A2" },
        { pattern: "Biceps", exercise: "EZ Bar Spider Curl (on Incline Bench)", rack: "-", baseline: 35, tempo: "3-1-2-1", ss: "B1" },
        { pattern: "Triceps", exercise: "Band Triceps Pushdown (Anchored High)", rack: "Black Band", baseline: 0, tempo: "2-1-2-0", ss: "B2" }
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
        { pattern: "Rear Delts", exercise: "Band Face Pulls (Anchored to Rack)", rack: "Red Band", baseline: 0, tempo: "2-1-2-0", ss: "A1" },
        { pattern: "Abs", exercise: "Weighted Crunch (with Dumbbell)", rack: "-", baseline: 25, tempo: "2-1-2-1", ss: "A2" },
        { pattern: "Biceps", exercise: "Dumbbell Concentration Curl", rack: "-", baseline: 15, tempo: "3-1-2-1", ss: "B1" },
        { pattern: "Triceps", exercise: "Dumbbell OH Triceps Extension", rack: "-", baseline: 25, tempo: "3-1-2-1", ss: "B2" }
      ]
    },
    {
      title: "Lower Body — Day 4 (Posterior Chain Emphasis)",
      exercises: [
        { pattern: "Glutes/Hams (Hinge)", exercise: "Barbell Deficit Deadlift", rack: "Floor Pull", baseline: 205, tempo: "3-1-1-0", ss: "" },
        { pattern: "Hamstring Hinge", exercise: "Barbell Stiff-Leg Deadlift", rack: "-", baseline: 145, tempo: "3-1-1-0", ss: "" },
        { pattern: "Quads (Unilateral)", exercise: "Barbell Front Squat", rack: "Safety Pin #6", baseline: 115, tempo: "3-1-1-0", ss: "" },
        { pattern: "Hamstring Isolation", exercise: "Slider Leg Curl", rack: "-", baseline: 0, tempo: "4-1-2-0", ss: "A1" },
        { pattern: "Calves", exercise: "Kettlebell Calf Raise", rack: "-", baseline: 35, tempo: "3-2-1-1", ss: "A2" },
        { pattern: "Traps", exercise: "Barbell Behind-the-Back Shrug", rack: "-", baseline: 155, tempo: "2-1-1-1", ss: "" }
      ]
    }
  ]
};

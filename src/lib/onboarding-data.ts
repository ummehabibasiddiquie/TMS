export type OnboardingStatus = "done" | "active" | "pending" | "locked";

export const onboardingSteps = [
  {
    title: "Team Introduction",
    day: "Day 1",
    duration: "~30 min",
    type: "Manual",
    status: "active" as OnboardingStatus,
    description: "Join standup and meet your team lead and fellow annotators.",
  },
  {
    title: "Landscape Training Module",
    day: "Day 2-3",
    duration: "~3 hrs",
    type: "Self-study",
    status: "locked" as OnboardingStatus,
    description: "Complete all 9 annotation class modules with include/exclude rules.",
  },
  {
    title: "Certification Quiz",
    day: "Day 3",
    duration: "~20 min",
    type: "Auto-graded",
    status: "locked" as OnboardingStatus,
    description: "Pass the Landscape knowledge check with 80% or higher.",
  },
];

export const projects = [
  {
    key: "landscape",
    initial: "L",
    name: "Landscape",
    category: "Data Annotation",
    description: "Label sidewalks, buildings, flora, parking, and more on aerial imagery.",
    status: "Training available",
    detail: "Quiz pending",
    progress: "3 of 9 modules",
    available: true,
  },
  {
    key: "email-replies",
    initial: "E",
    name: "Email Replies",
    category: "Communication",
    description: "Draft and review professional email responses for clients and partners.",
    status: "Coming soon",
    detail: "Training documentation not yet available.",
    progress: "",
    available: false,
  },
  {
    key: "quality-control",
    initial: "Q",
    name: "Quality Control",
    category: "Review & QC",
    description: "Review and accept or reject annotated work to maintain quality standards.",
    status: "Coming soon",
    detail: "Training documentation not yet available.",
    progress: "",
    available: false,
  },
  {
    key: "data-collection",
    initial: "D",
    name: "Data Collection",
    category: "Data Ops",
    description: "Source, format, and validate structured data assets per project specs.",
    status: "Coming soon",
    detail: "Training documentation not yet available.",
    progress: "",
    available: false,
  },
];

export const landscapeModules = [
  {
    title: "Sidewalk",
    summary: "Paved pedestrian walking paths - 2 types",
    subTypes: "Municipal Sidewalk, Building Sidewalk",
    include: ["Mark only the walking surface", "Ramps used for walking access can be included"],
    exclude: ["Do not include roads, grass, stairs, or parking"],
    mistakes: ["Mistake: marking roads as sidewalks"],
    tips: ["Use concrete/asphalt walking context to separate sidewalks from drive lanes."],
  },
  {
    title: "Parking Spot",
    summary: "Individual designated vehicle parking areas",
    subTypes: "Individual vehicle slots",
    include: ["Mark one vehicle slot at a time"],
    exclude: ["Do not merge two slots into one shape"],
    mistakes: ["Mistake: treating the entire lot as one parking spot"],
    tips: ["Look for painted stall boundaries when visible."],
  },
  {
    title: "Parking Lot",
    summary: "Large multi-vehicle parking surface areas",
    subTypes: "Concrete, Asphalt",
    include: ["Mark the full parking surface"],
    exclude: ["Exclude sidewalks and pedestrian paths"],
    mistakes: ["Mistake: including drive lanes that are not part of the parking surface"],
    tips: ["Separate lot surface from surrounding pedestrian access."],
  },
  {
    title: "Parcel Boundary",
    summary: "Outer legal boundary of a property parcel",
    subTypes: "Closed polygon",
    include: ["Mark the full legal property boundary"],
    exclude: ["Exclude neighboring parcels"],
    mistakes: ["Mistake: drawing only around the building footprint"],
    tips: ["The shape must close cleanly."],
  },
  {
    title: "Non-Flora",
    summary: "Man-made surface areas - 8 sub-types",
    subTypes: "Pool, Paved Area, Driveway, Drive Lane, Patio, Gravel Pit, Retention Pond, Other",
    include: ["Driveways, patios, pools, paved areas, and other artificial surfaces"],
    exclude: ["Exclude living vegetation and planted beds"],
    mistakes: ["Mistake: labeling driveway as parking lot"],
    tips: ["Choose the most specific sub-type available."],
  },
  {
    title: "Obstructions",
    summary: "Physical barriers - Fence, Other",
    subTypes: "Fence, Other",
    include: ["Physical barriers restricting movement"],
    exclude: ["Exclude gates; use the separate access class when available"],
    mistakes: ["Mistake: grouping gates with fences"],
    tips: ["Trace the visible barrier, not its shadow."],
  },
  {
    title: "Planted Bed",
    summary: "Landscaped areas with intentionally grown plants",
    subTypes: "Organized flower/shrub areas",
    include: ["Flower and shrub beds with clear edging"],
    exclude: ["Exclude lawn grass and empty soil"],
    mistakes: ["Mistake: labeling plain grass as planted bed"],
    tips: ["Look for intentional landscaping patterns."],
  },
  {
    title: "Building",
    summary: "Permanent structures with occlusion states",
    subTypes: "Not Occluded, Occluded",
    include: ["Mark the roof footprint from aerial view"],
    exclude: ["Exclude temporary shade or vegetation"],
    mistakes: ["Mistake: skipping covered roof edges"],
    tips: ["If partially covered by trees, estimate from visible edges and mark occluded."],
  },
  {
    title: "Flora",
    summary: "All living vegetation - 6 sub-types",
    subTypes: "Lawn, Tree, Bush/Shrub, Hedge, Other, Ground",
    include: ["Living vegetation including lawn, trees, shrubs, hedges, and ground cover"],
    exclude: ["Exclude artificial turf and non-living surfaces"],
    mistakes: ["Mistake: mixing planted bed and generic flora when edging is clear"],
    tips: ["Use the sub-type that best describes the dominant vegetation."],
  },
];

export const landscapeQuiz = [
  {
    question: "A paved path running parallel to a main road. What class should you annotate it as?",
    options: ["Parking Lot", "Sidewalk (Municipal)", "Non-Flora (Paved Area)", "Parcel Boundary"],
    correctIndex: 1,
  },
  {
    question: "A driveway from the road to a garage should be labeled as which class?",
    options: ["Flora", "Parking Spot", "Non-Flora - Paved Area (Driveway)", "Building"],
    correctIndex: 2,
  },
  {
    question: "A building is partially covered by trees in aerial view. How should it be annotated?",
    options: [
      "Skip the hidden section",
      "Occluded Building, estimated from visible edges",
      "Flora only",
      "Parcel Boundary",
    ],
    correctIndex: 1,
  },
  {
    question: "Which must be excluded when marking a Parking Lot?",
    options: ["Asphalt surface", "Parking spaces", "Sidewalks and pedestrian paths", "Visible lot edges"],
    correctIndex: 2,
  },
  {
    question: "Organized flower beds with brick edging near a house front should be labeled as what?",
    options: ["Planted Bed", "Flora - Lawn", "Non-Flora - Patio", "Obstruction"],
    correctIndex: 0,
  },
];

export function onboardingProgress() {
  const completed = onboardingSteps.filter((step) => step.status === "done").length;
  return {
    completed,
    total: onboardingSteps.length,
    percent: Math.round((completed / onboardingSteps.length) * 100),
  };
}

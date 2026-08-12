const CATEGORIES = [
  'Weather Advisory',
  'Tropical Cyclone',
  'Rainfall Warning',
  'Thunderstorm Advisory',
  'Flood Advisory',
  'Severe Weather',
  'Earthquake',
  'Climate',
  'Public Advisory',
  'General News',
  'Other',
];

const RULES = [
  { category: 'Tropical Cyclone', patterns: [/typhoon|tropical cyclone|bagyo|signal\s*#?\d/i] },
  { category: 'Rainfall Warning', patterns: [/rainfall|heavy rain|moderate to heavy rain/i] },
  { category: 'Thunderstorm Advisory', patterns: [/thunderstorm|lightning/i] },
  { category: 'Flood Advisory', patterns: [/flood|flash flood/i] },
  { category: 'Severe Weather', patterns: [/severe weather| gale |storm warning/i] },
  { category: 'Earthquake', patterns: [/earthquake|magnitude\s*\d/i] },
  { category: 'Climate', patterns: [/climate|el nino|la nina|drought/i] },
  { category: 'Weather Advisory', patterns: [/weather advisory|heat index|temperature advisory/i] },
  { category: 'Public Advisory', patterns: [/public advisory|announcement|advisory no/i] },
  { category: 'General News', patterns: [/press release|news|update/i] },
];

function classifyCategory(title, content) {
  const text = `${title}\n${content}`;
  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(text))) {
      return rule.category;
    }
  }
  return 'Other';
}

function classifySeverity(category, title, content) {
  const text = `${title}\n${content}`.toLowerCase();
  if (/signal\s*#?\s*[4-5]|extreme|life-threatening|catastrophic/.test(text)) {
    return 'critical';
  }
  if (/signal\s*#?\s*3|severe|heavy to intense|dangerous/.test(text)) {
    return 'high';
  }
  if (/moderate|signal\s*#?\s*2|warning/.test(text)) {
    return 'moderate';
  }
  if (/light|monitor|watch|advisory/.test(text)) {
    return 'low';
  }
  if (category === 'General News' || category === 'Climate') {
    return 'info';
  }
  return 'unknown';
}

/** Extract location mentions — only strings appearing in source text */
function extractLocations(title, content) {
  const text = `${title}\n${content}`;
  const found = new Set();

  const patterns = [
    /(?:over|in|across|within)\s+([A-Z][A-Za-z0-9\s\-(),.]+?)(?:\.|,|\s+and\s+|\s+which|\s+that|\s+are|\s+is|\s+will|\s+may)/g,
    /(Tuguegarao City|Cagayan Valley|Region\s+[IVX]+(?:\s*\([^)]+\))?|Metro Manila|Luzon|Visayas|Mindanao)/gi,
  ];

  for (const pattern of patterns) {
    let match = pattern.exec(text);
    while (match) {
      const loc = (match[1] || match[0]).replace(/\s+/g, ' ').trim();
      if (loc.length >= 3 && loc.length <= 120) {
        found.add(loc);
      }
      match = pattern.exec(text);
    }
  }

  return [...found].slice(0, 8);
}

module.exports = { CATEGORIES, classifyCategory, classifySeverity, extractLocations };

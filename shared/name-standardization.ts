const SUBJECT_MAPPING: Record<string, string> = {
  // English variations
  "eng": "English",
  "english": "English",
  "english language": "English",
  "english lang": "English",

  // Additional Mathematics
  "addma": "Additional Mathematics",
  "add maths": "Additional Mathematics",
  "additional maths": "Additional Mathematics",
  "additional mathematics": "Additional Mathematics",

  // Special papers
  "sp 1": "Special Paper 1",
  "sp1": "Special Paper 1",
  "special paper i": "Special Paper 1",
  "special paper 1": "Special Paper 1",
  "sp. 1": "Special Paper 1",
  "sp. paper 1": "Special Paper 1",
  "sp. paper i": "Special Paper 1",

  "sp 2": "Special Paper 2",
  "sp2": "Special Paper 2",
  "special paper ii": "Special Paper 2",
  "special paper 2": "Special Paper 2",
  "sp. 2": "Special Paper 2",
  "sp. paper 2": "Special Paper 2",
  "sp. paper ii": "Special Paper 2",

  // Accounts
  "accounts": "Principles of Accounts",
  "principals ofaccounts": "Principles of Accounts",
  "principals of accounts": "Principles of Accounts",
  "principles ofaccounts": "Principles of Accounts",
  "principles of accounts": "Principles of Accounts",

  // ICT
  "ict": "ICT",
  "information communication technology": "ICT",
  "information and communication technology": "ICT",
  "computer studies": "Computer Studies",

  // Local languages
  "nyanja": "Cinyanja",
  "cinyanja": "Cinyanja",
  "chinyanja": "Cinyanja",
  "icibemba": "Icibemba",
  "bemba": "Icibemba",

  // Agricultural science
  "agricultural science": "Agricultural Science",
  "agricultural sciences": "Agricultural Science",
  "agricultural studies": "Agricultural Science",

  // Physical education
  "physical education": "Physical Education",
  "physical education & sport": "Physical Education",
  "physical education and sport": "Physical Education",
  "pe": "Physical Education",

  // Literature
  "literature": "Literature in English",
  "literiture": "Literature in English",
  "literature in english": "Literature in English",
};

const DEPARTMENT_MAPPING: Record<string, string> = {
  "math": "Mathematics",
  "maths": "Mathematics",
  "mathematics": "Mathematics",
  "language": "Languages",
  "languages": "Languages",
  "languages department": "Languages",
  "languages dept": "Languages",
  "literature and languages": "Languages",
  "literature and language": "Languages",
  "social science": "Social Sciences",
  "social sciences": "Social Sciences",
  "business": "Business Studies",
  "business studies": "Business Studies",
  "business and finance": "Business Studies",
  "business & finance": "Business Studies",
  "natural science": "Natural Sciences",
  "natural sciences": "Natural Sciences",
  "home economics": "Home Economics",
  "home economic": "Home Economics",
  "design & technology": "Design and Technology",
  "design and technology": "Design and Technology",
  "technology": "Design and Technology",
  "technolgy": "Design and Technology",
  "ict": "ICT",
  "computer studies": "Computer Studies",
  "physical education": "Physical Education",
  "pe": "Physical Education",
  "creative arts": "Expressive Arts",
  "expressive arts": "Expressive Arts",
  "expressive art": "Expressive Arts",
  "expressive": "Expressive Arts",
  "expressive and performing arts": "Expressive Arts",
  "practical": "Practical Subjects",
  "practical subjects": "Practical Subjects",
};

export function toTitleCase(str: string): string {
  const lowercaseWords = ["and", "or", "but", "a", "an", "the", "in", "on", "of", "for", "with", "to", "at", "by", "from"];
  return str
    .toLowerCase()
    .split(" ")
    .map((word, index) => {
      if (index > 0 && lowercaseWords.includes(word)) {
        return word;
      }
      if (["ict", "re", "pe", "sp", "sp1", "sp2"].includes(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function standardizeSubjectName(name: string): string {
  if (!name) return "";
  let clean = name.trim().replace(/\s+/g, " ");
  
  // Standardize & to and
  clean = clean.replace(/\s*&\s*/g, " and ");
  clean = clean.replace(/\s+/g, " ");

  const key = clean.toLowerCase();
  if (SUBJECT_MAPPING[key]) {
    return SUBJECT_MAPPING[key];
  }

  return toTitleCase(clean);
}

export function standardizeClassName(name: string): string {
  if (!name) return "";
  let clean = name.trim().replace(/\s+/g, " ");
  
  let titleCased = clean
    .toLowerCase()
    .split(" ")
    .map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");

  // Capitalize trailing letters following numbers, e.g. Grade 12a -> Grade 12A, 12-a -> 12-A, 12 a -> 12 A
  titleCased = titleCased.replace(/([0-9]+)([a-z])\b/gi, (match, num, letter) => num + letter.toUpperCase());
  // If a word is just a single letter, uppercase it
  titleCased = titleCased.replace(/\b([a-z])\b/gi, (match, letter) => letter.toUpperCase());

  return titleCased;
}

export function standardizeDepartmentName(name: string): string {
  if (!name) return "";
  let clean = name.trim().replace(/\s+/g, " ");
  
  // Standardize & to and
  clean = clean.replace(/\s*&\s*/g, " and ");
  clean = clean.replace(/\s+/g, " ");

  const key = clean.toLowerCase();
  if (DEPARTMENT_MAPPING[key]) {
    return DEPARTMENT_MAPPING[key];
  }

  return toTitleCase(clean);
}

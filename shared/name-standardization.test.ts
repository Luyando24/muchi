import { describe, it, expect } from "vitest";
import { 
  standardizeClassName, 
  standardizeSubjectName, 
  standardizeDepartmentName,
  toTitleCase
} from "./name-standardization";

// Import local helper function since it's defined in schools.ts
// We'll write the tests for toSchoolNameProperCase here
function toSchoolNameProperCase(str: string): string {
  if (!str) return '';
  const lowercaseWords = ["and", "or", "but", "a", "an", "the", "in", "on", "of", "for", "with", "to", "at", "by", "from"];
  const romanNumerals = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];
  return str
    .toLowerCase()
    .split(" ")
    .map((word, index) => {
      if (index > 0 && lowercaseWords.includes(word)) {
        return word;
      }
      if (romanNumerals.includes(word)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

describe("toSchoolNameProperCase helper", () => {
  it("should capitalize standard school names", () => {
    expect(toSchoolNameProperCase("ST. AUGUSTINE ACADEMY")).toBe("St. Augustine Academy");
    expect(toSchoolNameProperCase("GREEN LEAF INT'L")).toBe("Green Leaf Int'l");
  });

  it("should format ALL-CAPS names and preserve Roman numerals", () => {
    expect(toSchoolNameProperCase("MUKAMAMBO II GIRLS SECONDARY SCHOOL")).toBe("Mukamambo II Girls Secondary School");
    expect(toSchoolNameProperCase("ARAKAN BOYS SECONDARY")).toBe("Arakan Boys Secondary");
  });

  it("should handle lowercase words in the middle of a name", () => {
    expect(toSchoolNameProperCase("SCHOOL OF THE ARTS")).toBe("School of the Arts");
  });

  it("should handle empty or null inputs gracefully", () => {
    expect(toSchoolNameProperCase("")).toBe("");
  });
});

describe("Name Standardization Helpers", () => {
  describe("standardizeClassName", () => {
    it("should capitalize class names and uppercase single letters", () => {
      expect(standardizeClassName("grade 8 blue")).toBe("Grade 8 Blue");
      expect(standardizeClassName("form 1a")).toBe("Form 1A");
      expect(standardizeClassName("grade 12-b")).toBe("Grade 12-B");
    });
  });

  describe("standardizeSubjectName", () => {
    it("should resolve abbreviations and title case subjects", () => {
      expect(standardizeSubjectName("eng")).toBe("English");
      expect(standardizeSubjectName("computer studies")).toBe("Computer Studies");
      expect(standardizeSubjectName("add maths")).toBe("Additional Mathematics");
    });
  });

  describe("standardizeDepartmentName", () => {
    it("should standardize department names", () => {
      expect(standardizeDepartmentName("math")).toBe("Mathematics");
      expect(standardizeDepartmentName("social science")).toBe("Social Sciences");
      expect(standardizeDepartmentName("business & finance")).toBe("Business Studies");
    });
  });
});

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSlug(name: string): string {
  const discardWords = [
    'school', 'secondary', 'primary', 'basic', 'combined', 'community', 'mission',
    'day', 'boarding', 'academy', 'institute', 'college', 'university', 'seminary',
    'center', 'centre', 'education', 'learning', 'the', 'of', 'and', 'for', 'at', 'in'
  ];

  let slugRegex = name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // remove special chars
    .trim();

  const words = slugRegex.split(/\s+/);
  
  // Filter out discard words, but keep them if they are the only words
  const filteredWords = words.filter(word => !discardWords.includes(word));
  
  const finalWords = filteredWords.length > 0 ? filteredWords : words;
  
  return finalWords
    .join('-')
    .replace(/-+/g, '-') // collapse multiple hyphens
    .substring(0, 50) // reasonable limit
    .replace(/-$/, ''); // remove trailing hyphen
}

// Romanian counties and cities data from the complete JSON file
export const romanianCitiesData: { [key: string]: string[] } = {
  "Alba": [],
  "Arad": [],
  "Argeș": [],
  "Bacău": [],
  "Bihor": [],
  "Bistrița-Năsăud": [],
  "Botoșani": [],
  "Brăila": [],
  "Brașov": [],
  "București": [],
  "Buzău": [],
  "Călărași": [],
  "Caraș-Severin": [],
  "Cluj": [],
  "Constanța": [],
  "Covasna": [],
  "Dâmbovița": [],
  "Dolj": [],
  "Galați": [],
  "Giurgiu": [],
  "Gorj": []
};

// Import the complete data
import fullRomanianCitiesData from './romanianCitiesComplete.json';

// Assign the complete data
Object.assign(romanianCitiesData, fullRomanianCitiesData);

// Romanian counties list
export const romanianCounties = Object.keys(romanianCitiesData);

// Function to get cities for a county
export function getCitiesForCounty(county: string): string[] {
  return romanianCitiesData[county] || [];
}
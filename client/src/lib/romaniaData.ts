// Romanian counties
export const romanianCounties = [
  "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud", "Botoșani", "Brașov",
  "Brăila", "București", "Buzău", "Caraș-Severin", "Călărași", "Cluj", "Constanța",
  "Covasna", "Dâmbovița", "Dolj", "Galați", "Giurgiu", "Gorj", "Harghita", "Hunedoara",
  "Ialomița", "Iași", "Ilfov", "Maramureș", "Mehedinți", "Mureș", "Neamț", "Olt",
  "Prahova", "Satu Mare", "Sălaj", "Sibiu", "Suceava", "Teleorman", "Timiș", "Tulcea",
  "Vaslui", "Vâlcea", "Vrancea"
];

// Function to get cities for a county
export function getCitiesForCounty(county: string): string[] {
  const cityMap: { [key: string]: string[] } = {
    "București": ["Sector 1", "Sector 2", "Sector 3", "Sector 4", "Sector 5", "Sector 6"],
    "Cluj": ["Cluj-Napoca", "Turda", "Dej", "Câmpia Turzii", "Gherla", "Huedin"],
    "Timiș": ["Timișoara", "Lugoj", "Sânnicolau Mare", "Jimbolia", "Deta", "Buziaș"],
    // Add more cities as needed
  };

  return cityMap[county] || ["Oraș Principal"]; // Return default city if county not found
}

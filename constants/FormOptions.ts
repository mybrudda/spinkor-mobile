// Category + Subcategory definitions (inspired by snippet)
export type CategoryValue =
  | 'vehicles'
  | 'electronics'
  | 'home_furniture'
  | 'clothing_fashion'
  | 'sports_outdoors'
  | 'pets_animals'
  | 'baby_kids'
  | 'real_estate'
  | 'tools_industrial'
  | 'hobby_entertainment'
  | 'health_beauty'
  | 'office_business'
  | 'services'
  | 'other';

export type SubcategoryValue = string;

export const CATEGORIES: Record<CategoryValue, SubcategoryValue[]> = {
  vehicles: [
    'cars',
    'motorcycles',
    'scooters',
    'bicycles',
    'trucks',
    'vans',
    'boats',
    'rvs_campers',
    'vehicle_parts',
    'tires_rims',
  ],
  electronics: [
    'mobile_phones',
    'computers',
    'tablets',
    'tvs',
    'cameras',
    'gaming_consoles',
    'audio_headphones',
    'smartwatches',
    'home_appliances',
    'drones',
  ],
  home_furniture: [
    'furniture',
    'home_decor',
    'kitchenware',
    'lighting',
    'rugs_carpets',
    'storage',
    'bedding',
    'outdoor_furniture',
  ],
  clothing_fashion: [
    'mens_clothing',
    'womens_clothing',
    'kids_clothing',
    'shoes',
    'bags',
    'jewelry_accessories',
    'watches',
  ],
  sports_outdoors: [
    'fitness_equipment',
    'bicycles_gear',
    'camping_gear',
    'sports_apparel',
    'outdoor_equipment',
    'fishing_gear',
  ],
  pets_animals: ['pet_supplies', 'pet_food', 'pet_accessories', 'livestock', 'animals_for_sale'],
  baby_kids: ['baby_clothing', 'baby_gear', 'toys', 'kids_furniture', 'school_supplies'],
  real_estate: [
    'apartments',
    'houses',
    'rooms',
    'land',
    'commercial_property',
  ],
  tools_industrial: ['power_tools', 'hand_tools', 'construction_equipment', 'machinery', 'industrial_supplies'],
  hobby_entertainment: ['musical_instruments', 'books', 'board_games', 'collectibles', 'art_crafts'],
  health_beauty: ['beauty_products', 'personal_care', 'medical_supplies', 'supplements', 'perfumes'],
  office_business: ['office_furniture', 'stationery', 'business_equipment', 'pos_devices'],
  services: ['cleaning', 'moving_delivery', 'repair_services', 'home_improvement', 'pet_services'],
  other: ['other'],
};

export const CATEGORY_VALUES = Object.keys(CATEGORIES) as CategoryValue[];

export const formatCategoryLabel = (value: string) =>
  value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const CATEGORY_OPTIONS = CATEGORY_VALUES.map(value => ({
  value,
  label: formatCategoryLabel(value),
}));

const LEGACY_CATEGORY_MAP: Record<string, CategoryValue> = {
  vehicle: 'vehicles',
  electronics: 'electronics',
  home: 'home_furniture',
  fashion: 'clothing_fashion',
  beauty: 'health_beauty',
  sports: 'sports_outdoors',
  kids: 'baby_kids',
  pets: 'pets_animals',
  'real-estate': 'real_estate',
  jobs: 'office_business',
  services: 'services',
  other: 'other',
};

export function getSubcategories(category: CategoryValue): SubcategoryValue[] {
  return CATEGORIES[category] || [];
}

export function isValidCategory(category: string): category is CategoryValue {
  return (Object.keys(CATEGORIES) as CategoryValue[]).includes(category as CategoryValue);
}

export function isValidSubcategory(category: CategoryValue, subcategory: string): subcategory is SubcategoryValue {
  return (getSubcategories(category) as string[]).includes(subcategory);
}

export function normalizeCategoryValue(category?: string | null): CategoryValue {
  if (!category) return 'vehicles';
  if (isValidCategory(category)) return category;
  return LEGACY_CATEGORY_MAP[category] ?? 'vehicles';
}

export const MAKES: string[] = [
  "Acura",
  "Alfa Romeo",
  "Aston Martin",
  "Audi",
  "Bentley",
  "BMW",
  "Bugatti",
  "Buick",
  "Cadillac",
  "Chevrolet",
  "Chrysler",
  "Citroën",
  "Dodge",
  "Ferrari",
  "Fiat",
  "Ford",
  "Genesis",
  "GMC",
  "Honda",
  "Hyundai",
  "Infiniti",
  "Jaguar",
  "Jeep",
  "Kia",
  "Koenigsegg",
  "Lamborghini",
  "Land Rover",
  "Lexus",
  "Lincoln",
  "Lotus",
  "Maserati",
  "Mazda",
  "McLaren",
  "Mercedes-Benz",
  "Mini",
  "Mitsubishi",
  "Nissan",
  "Pagani",
  "Peugeot",
  "Pontiac",
  "Porsche",
  "Ram",
  "Renault",
  "Rolls-Royce",
  "Saab",
  "Saturn",
  "Scion",
  "Subaru",
  "Tesla",
  "Toyota",
  "Volkswagen",
  "Volvo",
  "Other"
];



// Common options:
export const YEARS: string[] = Array.from({ length: 50 }, (_, i) => (new Date().getFullYear() - i).toString());

// Legacy export - use getCitiesForCountry from CountryData instead
// This is kept for backward compatibility but should be migrated
export const CITIES: string[] = [
  "Kabul",
  "Kandahar",
  "Herat",
  "Mazar-e-Sharif",
  "Kunduz",
  "Jalalabad",
  "Ghazni",
  "Balkh",
  "Baghlan",
  "Khost",
  "Kunar",
  "Nangarhar",
  "Paktia",
  "Paktika",
  "Zabul",
  "Uruzgan",
  "Helmand",
  "Farah",
  "Nimroz",
  "Badghis",
  "Ghor",
  "Bamyan",
  "Daykundi",
  "Panjshir",
  "Kapisa",
  "Parwan",
  "Wardak",
  "Logar",
  "Nuristan",
  "Badakhshan",
  "Takhar",
  "Samangan",
  "Sar-e-Pul",
  "Faryab",
  "Jowzjan",
  "Other"
];


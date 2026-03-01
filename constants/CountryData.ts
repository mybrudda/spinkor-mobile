export type Country = 'afghanistan' | 'pakistan';

export interface CountryInfo {
  name: string;
  cities: string[];
  currency: string;
  currencySymbol: string;
}

export const COUNTRY_DATA: Record<Country, CountryInfo> = {
  afghanistan: {
    name: 'Afghanistan',
    cities: [
      'Kabul',
      'Kandahar',
      'Herat',
      'Mazar-e-Sharif',
      'Kunduz',
      'Jalalabad',
      'Ghazni',
      'Balkh',
      'Baghlan',
      'Khost',
      'Kunar',
      'Nangarhar',
      'Paktia',
      'Paktika',
      'Zabul',
      'Uruzgan',
      'Helmand',
      'Farah',
      'Nimroz',
      'Badghis',
      'Ghor',
      'Bamyan',
      'Daykundi',
      'Panjshir',
      'Kapisa',
      'Parwan',
      'Wardak',
      'Logar',
      'Nuristan',
      'Badakhshan',
      'Takhar',
      'Samangan',
      'Sar-e-Pul',
      'Faryab',
      'Jowzjan',
      'Other',
    ],
    currency: 'AFN',
    currencySymbol: 'AFN',
  },
  pakistan: {
    name: 'Pakistan',
    cities: [
      'Karachi',
      'Lahore',
      'Faisalabad',
      'Rawalpindi',
      'Multan',
      'Gujranwala',
      'Peshawar',
      'Quetta',
      'Islamabad',
      'Sialkot',
      'Bahawalpur',
      'Sargodha',
      'Sukkur',
      'Larkana',
      'Sheikhupura',
      'Rahim Yar Khan',
      'Jhang',
      'Dera Ghazi Khan',
      'Gujrat',
      'Kasur',
      'Mardan',
      'Mingaora',
      'Nawabshah',
      'Chiniot',
      'Kotri',
      'Khanpur',
      'Hafizabad',
      'Kohat',
      'Jacobabad',
      'Shikarpur',
      'Muzaffargarh',
      'Khanewal',
      'Gojra',
      'Bahawalnagar',
      'Abbottabad',
      'Muridke',
      'Pakpattan',
      'Khuzdar',
      'Jhelum',
      'Sahiwal',
      'Other',
    ],
    currency: 'PKR',
    currencySymbol: 'PKR',
  },
};

export function getCitiesForCountry(country: Country | null): string[] {
  if (!country) return COUNTRY_DATA.afghanistan.cities;
  return COUNTRY_DATA[country].cities;
}

export function getCurrencyForCountry(country: Country | null): string {
  if (!country) return COUNTRY_DATA.afghanistan.currency;
  return COUNTRY_DATA[country].currency;
}

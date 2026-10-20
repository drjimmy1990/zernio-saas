export interface AvailablePhoneNumber {
  id: string;
  phoneNumber: string;
  country: string;
  countryName: string;
  flag: string;
  type: 'local' | 'mobile' | 'toll_free' | 'national';
  locality: string;
  monthlyPriceUsd: number;
  monthlyCents?: number;
  requestOnly?: boolean;
  setupPriceUsd: number;
  capabilities: {
    voice: boolean;
    sms: boolean;
    whatsapp: boolean;
  };
  needsKyc: boolean;
  addressConstraint: 'none' | 'country' | 'geo';
}

export interface OwnedPhoneNumber {
  id: string;
  phoneNumber: string;
  country: string;
  countryName: string;
  flag: string;
  type: 'local' | 'mobile' | 'toll_free' | 'national';
  status: 'active' | 'kyc_required' | 'pending' | 'pending_payment' | 'pending_regulatory' | 'regulatory_declined' | 'provisioning' | 'verifying' | 'suspended' | 'releasing' | 'released';
  monthlyPriceUsd: number | null;
  profileId?: string;
  socialAccountId?: string | null;
  ownerAccountId?: string | null;
  provisionedAt: string;
  voiceEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  whatsappLinked: boolean;
  forwardTo?: string;
  kycUrl?: string;
  brandedCallingStatus?: string;
  dlcStatus?: string;
  whatsappDetails?: {
    displayName: string;
    category: string;
    verifiedAt: string;
    verificationMethod: 'sms_otp' | 'voice_otp' | 'qr_code';
    wabaId: string;
    templates: Array<{
      name: string;
      category: 'UTILITY' | 'MARKETING';
      status: 'APPROVED';
      body: string;
      language: string;
    }>;
  };
  voiceAgent?: {
    enabled: boolean;
    agentName: string;
    language: string;
    systemPrompt: string;
    voicePersona: string;
    humanTransferNumber?: string;
    forwardTo?: string;
    recordingEnabled: boolean;
    transcriptionEnabled: boolean;
  };
}

export interface CallTranscriptLine {
  role: 'agent' | 'customer' | 'system';
  text: string;
  timestamp: string;
}

export interface CallRecord {
  id: string;
  fromNumber: string;
  toNumber: string;
  channel: 'pstn' | 'whatsapp';
  direction: 'inbound' | 'outbound';
  mode: 'direct_voice' | 'ai_voice_agent';
  status: 'completed' | 'in_progress' | 'busy' | 'no_answer';
  durationSeconds: number;
  recordingUrl: string;
  transcripts: CallTranscriptLine[];
  createdAt: string;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  channel: 'sms' | 'whatsapp';
  direction: 'inbound' | 'outbound';
  fromNumber: string;
  toNumber: string;
  text: string;
  mediaUrls?: string[];
  status: 'sent' | 'delivered' | 'read';
  timestamp: string;
}

export interface ConversationThread {
  id: string;
  virtualNumber: string;
  customerNumber: string;
  customerName: string;
  channel: 'sms' | 'whatsapp';
  unreadCount: number;
  lastMessage: string;
  lastMessageAt: string;
  messages: MessageItem[];
}

export interface TelephonyCountry {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
  localities: string[];
  types: Array<'local' | 'mobile' | 'toll_free'>;
  monthlyUsd: number;
  needsKyc: boolean;
  samplePrefix: string;
}

// 55+ Supported Countries with genuine country metadata, flags and area codes
export const GLOBAL_TELEPHONY_COUNTRIES: TelephonyCountry[] = [
  // North America
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', localities: ['San Francisco', 'New York', 'Austin', 'Miami', 'Chicago'], types: ['local', 'mobile', 'toll_free'], monthlyUsd: 3, needsKyc: false, samplePrefix: '415' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦', localities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary'], types: ['local', 'mobile', 'toll_free'], monthlyUsd: 3, needsKyc: false, samplePrefix: '416' },
  // Europe
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', localities: ['London', 'Manchester', 'Edinburgh', 'Birmingham'], types: ['local', 'mobile', 'toll_free'], monthlyUsd: 3, needsKyc: false, samplePrefix: '20' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', localities: ['Berlin', 'Munich', 'Frankfurt', 'Hamburg'], types: ['local', 'mobile'], monthlyUsd: 4, needsKyc: true, samplePrefix: '30' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', localities: ['Paris', 'Lyon', 'Marseille'], types: ['local', 'mobile', 'toll_free'], monthlyUsd: 4, needsKyc: true, samplePrefix: '1' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸', localities: ['Madrid', 'Barcelona', 'Valencia'], types: ['local', 'mobile'], monthlyUsd: 3, needsKyc: false, samplePrefix: '91' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹', localities: ['Rome', 'Milan', 'Naples'], types: ['local', 'mobile'], monthlyUsd: 4, needsKyc: true, samplePrefix: '06' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱', localities: ['Amsterdam', 'Rotterdam', 'Utrecht'], types: ['local', 'mobile'], monthlyUsd: 4, needsKyc: false, samplePrefix: '20' },
  { code: 'BE', name: 'Belgium', dialCode: '+32', flag: '🇧🇪', localities: ['Brussels', 'Antwerp', 'Ghent'], types: ['local', 'mobile'], monthlyUsd: 4, needsKyc: true, samplePrefix: '2' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭', localities: ['Zurich', 'Geneva', 'Basel'], types: ['local', 'mobile', 'toll_free'], monthlyUsd: 6, needsKyc: true, samplePrefix: '44' },
  { code: 'AT', name: 'Austria', dialCode: '+43', flag: '🇦🇹', localities: ['Vienna', 'Salzburg', 'Graz'], types: ['local', 'mobile'], monthlyUsd: 4, needsKyc: true, samplePrefix: '1' },
  { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪', localities: ['Stockholm', 'Gothenburg', 'Malmo'], types: ['local', 'mobile'], monthlyUsd: 4, needsKyc: false, samplePrefix: '8' },
  { code: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴', localities: ['Oslo', 'Bergen', 'Trondheim'], types: ['local', 'mobile'], monthlyUsd: 5, needsKyc: false, samplePrefix: '21' },
  { code: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰', localities: ['Copenhagen', 'Aarhus', 'Odense'], types: ['local', 'mobile'], monthlyUsd: 4, needsKyc: false, samplePrefix: '32' },
  { code: 'FI', name: 'Finland', dialCode: '+358', flag: '🇫🇮', localities: ['Helsinki', 'Espoo', 'Tampere'], types: ['local', 'mobile'], monthlyUsd: 5, needsKyc: false, samplePrefix: '9' },
  { code: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪', localities: ['Dublin', 'Cork', 'Galway'], types: ['local', 'mobile', 'toll_free'], monthlyUsd: 4, needsKyc: false, samplePrefix: '1' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹', localities: ['Lisbon', 'Porto', 'Braga'], types: ['local', 'mobile'], monthlyUsd: 4, needsKyc: false, samplePrefix: '21' },
  { code: 'PL', name: 'Poland', dialCode: '+48', flag: '🇵🇱', localities: ['Warsaw', 'Krakow', 'Wroclaw'], types: ['local', 'mobile'], monthlyUsd: 3, needsKyc: false, samplePrefix: '22' },
  { code: 'CZ', name: 'Czech Republic', dialCode: '+420', flag: '🇨🇿', localities: ['Prague', 'Brno', 'Ostrava'], types: ['local', 'mobile'], monthlyUsd: 4, needsKyc: false, samplePrefix: '2' },
  { code: 'RO', name: 'Romania', dialCode: '+40', flag: '🇷🇴', localities: ['Bucharest', 'Cluj-Napoca', 'Timisoara'], types: ['local', 'mobile'], monthlyUsd: 3, needsKyc: false, samplePrefix: '21' },
  { code: 'HU', name: 'Hungary', dialCode: '+36', flag: '🇭🇺', localities: ['Budapest', 'Debrecen', 'Szeged'], types: ['local', 'mobile'], monthlyUsd: 4, needsKyc: false, samplePrefix: '1' },
  { code: 'GR', name: 'Greece', dialCode: '+30', flag: '🇬🇷', localities: ['Athens', 'Thessaloniki', 'Patras'], types: ['local', 'mobile'], monthlyUsd: 4, needsKyc: true, samplePrefix: '21' },
  // Middle East & North Africa (MENA)
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪', localities: ['Dubai', 'Abu Dhabi', 'Sharjah'], types: ['local', 'toll_free'], monthlyUsd: 15, needsKyc: true, samplePrefix: '4' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦', localities: ['Riyadh', 'Jeddah', 'Dammam'], types: ['local', 'toll_free'], monthlyUsd: 18, needsKyc: true, samplePrefix: '11' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬', localities: ['Cairo', 'Alexandria', 'Giza'], types: ['local', 'toll_free'], monthlyUsd: 12, needsKyc: true, samplePrefix: '2' },
  { code: 'QA', name: 'Qatar', dialCode: '+974', flag: '🇶🇦', localities: ['Doha', 'Al Rayyan'], types: ['local'], monthlyUsd: 20, needsKyc: true, samplePrefix: '44' },
  { code: 'KW', name: 'Kuwait', dialCode: '+965', flag: '🇰🇼', localities: ['Kuwait City', 'Hawally'], types: ['local'], monthlyUsd: 20, needsKyc: true, samplePrefix: '22' },
  { code: 'BH', name: 'Bahrain', dialCode: '+973', flag: '🇧🇭', localities: ['Manama', 'Riffa'], types: ['local'], monthlyUsd: 16, needsKyc: true, samplePrefix: '17' },
  { code: 'OM', name: 'Oman', dialCode: '+968', flag: '🇴🇲', localities: ['Muscat', 'Salalah'], types: ['local'], monthlyUsd: 18, needsKyc: true, samplePrefix: '24' },
  { code: 'JO', name: 'Jordan', dialCode: '+962', flag: '🇯🇴', localities: ['Amman', 'Zarqa'], types: ['local'], monthlyUsd: 10, needsKyc: true, samplePrefix: '6' },
  { code: 'LB', name: 'Lebanon', dialCode: '+961', flag: '🇱🇧', localities: ['Beirut', 'Tripoli'], types: ['local'], monthlyUsd: 12, needsKyc: true, samplePrefix: '1' },
  { code: 'MA', name: 'Morocco', dialCode: '+212', flag: '🇲🇦', localities: ['Casablanca', 'Rabat', 'Marrakech'], types: ['local', 'mobile'], monthlyUsd: 8, needsKyc: true, samplePrefix: '522' },
  // Asia-Pacific
  { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷', localities: ['Istanbul', 'Ankara', 'Izmir'], types: ['local', 'mobile'], monthlyUsd: 5, needsKyc: true, samplePrefix: '212' },
  { code: 'IL', name: 'Israel', dialCode: '+972', flag: '🇮🇱', localities: ['Tel Aviv', 'Jerusalem', 'Haifa'], types: ['local', 'mobile'], monthlyUsd: 5, needsKyc: false, samplePrefix: '3' },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬', localities: ['Singapore'], types: ['local', 'toll_free'], monthlyUsd: 5, needsKyc: true, samplePrefix: '6' },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵', localities: ['Tokyo', 'Osaka', 'Nagoya'], types: ['local', 'toll_free'], monthlyUsd: 8, needsKyc: true, samplePrefix: '3' },
  { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷', localities: ['Seoul', 'Busan', 'Incheon'], types: ['local'], monthlyUsd: 8, needsKyc: true, samplePrefix: '2' },
  { code: 'HK', name: 'Hong Kong', dialCode: '+852', flag: '🇭🇰', localities: ['Hong Kong'], types: ['local', 'mobile'], monthlyUsd: 5, needsKyc: true, samplePrefix: '3' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', localities: ['Sydney', 'Melbourne', 'Brisbane'], types: ['local', 'mobile', 'toll_free'], monthlyUsd: 4, needsKyc: true, samplePrefix: '2' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿', localities: ['Auckland', 'Wellington', 'Christchurch'], types: ['local', 'toll_free'], monthlyUsd: 4, needsKyc: false, samplePrefix: '9' },
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', localities: ['Mumbai', 'Delhi', 'Bengaluru'], types: ['local', 'toll_free'], monthlyUsd: 6, needsKyc: true, samplePrefix: '22' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾', localities: ['Kuala Lumpur', 'Penang'], types: ['local', 'mobile'], monthlyUsd: 5, needsKyc: true, samplePrefix: '3' },
  { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭', localities: ['Manila', 'Cebu'], types: ['local', 'mobile'], monthlyUsd: 5, needsKyc: true, samplePrefix: '2' },
  { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭', localities: ['Bangkok', 'Chiang Mai'], types: ['local'], monthlyUsd: 6, needsKyc: true, samplePrefix: '2' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳', localities: ['Ho Chi Minh City', 'Hanoi'], types: ['local'], monthlyUsd: 8, needsKyc: true, samplePrefix: '28' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩', localities: ['Jakarta', 'Surabaya', 'Bali'], types: ['local'], monthlyUsd: 7, needsKyc: true, samplePrefix: '21' },
  // Latin America
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷', localities: ['Sao Paulo', 'Rio de Janeiro', 'Brasilia'], types: ['local', 'mobile'], monthlyUsd: 6, needsKyc: true, samplePrefix: '11' },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽', localities: ['Mexico City', 'Guadalajara', 'Monterrey'], types: ['local', 'toll_free'], monthlyUsd: 4, needsKyc: false, samplePrefix: '55' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷', localities: ['Buenos Aires', 'Cordoba'], types: ['local'], monthlyUsd: 6, needsKyc: true, samplePrefix: '11' },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱', localities: ['Santiago', 'Valparaiso'], types: ['local'], monthlyUsd: 6, needsKyc: false, samplePrefix: '2' },
  { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴', localities: ['Bogota', 'Medellin'], types: ['local'], monthlyUsd: 5, needsKyc: true, samplePrefix: '1' },
  { code: 'PE', name: 'Peru', dialCode: '+51', flag: '🇵🇪', localities: ['Lima', 'Arequipa'], types: ['local'], monthlyUsd: 6, needsKyc: true, samplePrefix: '1' },
  // Africa
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦', localities: ['Johannesburg', 'Cape Town', 'Durban'], types: ['local', 'toll_free'], monthlyUsd: 5, needsKyc: true, samplePrefix: '11' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬', localities: ['Lagos', 'Abuja'], types: ['local'], monthlyUsd: 8, needsKyc: true, samplePrefix: '1' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪', localities: ['Nairobi', 'Mombasa'], types: ['local'], monthlyUsd: 7, needsKyc: true, samplePrefix: '20' },
];

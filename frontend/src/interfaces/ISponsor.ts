export type SponsorLevel = 'DIAMOND' | 'GOLD' | 'SILVER' | 'PARTNER';

export interface ISponsor {
  id: number;
  name: string;
  level: SponsorLevel;
  logoUrl: string;
  websiteUrl?: string | null;
  sortOrder: number;
  isActive: boolean;
}

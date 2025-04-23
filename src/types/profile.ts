export interface PersonalInfo {
  avatar?: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  email: string;
  phone?: string;
  phoneCode: string;
  country: string;
  city: string;
  jobTitle: string;
  seniority: string;
  jobType: string;
  professionalHeadline?: string;
  shortBio?: string;
}

export interface SalaryInfo {
  amount: string;
  period: string;
  currency: 'AUD' | 'RMB';
}

export interface LocationPreferences {
  openToRemote: boolean;
  openToRelocation: boolean;
}

export interface SocialPresence {
  linkedin?: string;
  twitter?: string;
  website?: string;
  video?: string;
}

export interface AdditionalDetails {
  skills: string[];
  employmentHistory: EmploymentHistory[];
  education: Education[];
  certifications: Certification[];
}

export interface EmploymentHistory {
  id: string;
  companyName: string;
  position: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description?: string;
}

export interface Certification {
  id: string;
  name: string;
  issuingOrganization: string;
  issueDate: string;
  expirationDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface ProfileFormData {
  personalInfo: PersonalInfo;
  salaryInfo: SalaryInfo;
  locationPreferences: LocationPreferences;
  socialPresence: SocialPresence;
  additionalDetails: AdditionalDetails;
  resume?: File;
}

export interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  jobTitles: string[];
  skills: string[];
  education: Education[];
  employmentHistory: EmploymentHistory[];
} 
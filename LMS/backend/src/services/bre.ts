export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export interface BreInput {
  pan: string;
  dob: string | Date;
  monthlySalary: number;
  employmentMode: string;
}

export function calculateAge(dob: Date, today = new Date()): number {
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

/** Returns a list of rejection reasons; an empty list means the applicant is eligible. */
export function runBre(input: BreInput): string[] {
  const errors: string[] = [];
  const dob = new Date(input.dob);
  if (isNaN(dob.getTime())) {
    errors.push('Date of birth is invalid.');
  } else {
    const age = calculateAge(dob);
    if (age < 23 || age > 50) errors.push(`Age must be between 23 and 50 (your age: ${age}).`);
  }
  if (!(input.monthlySalary >= 25000)) errors.push('Monthly salary must be at least Rs. 25,000.');
  if (!PAN_REGEX.test(String(input.pan || '').toUpperCase())) {
    errors.push('PAN format is invalid (expected e.g. ABCDE1234F).');
  }
  if (input.employmentMode === 'Unemployed') errors.push('Unemployed applicants are not eligible.');
  return errors;
}

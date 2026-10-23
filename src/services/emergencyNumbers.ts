/**
 * India emergency numbers. These are national numbers and are shown as fixed reference data.
 * Ambulance numbers differ between states, so the UI tells users that 112 works everywhere.
 */
export interface EmergencyNumber {
  number: string;
  label: string;
  note?: string;
}

export const INDIA_EMERGENCY_NUMBERS: EmergencyNumber[] = [
  { number: '112', label: 'Emergency (all services)', note: 'Works across India. Call this first if unsure.' },
  { number: '108', label: 'Ambulance', note: 'Available in most states. Availability varies by state.' },
  { number: '102', label: 'Ambulance (some states)', note: 'Available only in some states.' },
  { number: '100', label: 'Police' },
  { number: '101', label: 'Fire service' },
];
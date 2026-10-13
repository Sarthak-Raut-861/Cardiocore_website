/**
 * Verified Specialists Data
 * Preserved directly from the original CardioCore application (src/60_core.js).
 */

export interface Doctor {
  id: string;
  initials: string;
  avatarClass: string;
  name: string;
  specialty: string;
  hospital: string;
  when: string;
  mode: "In-person" | "Video" | "Both";
  rating: string;
}

export const DOCTORS: Doctor[] = [
  {
    id: "nr",
    initials: "NR",
    avatarClass: "bg-[var(--teal-soft)] text-[var(--teal-700)] border-[var(--teal)]/30",
    name: "Dr Neha Raghavan",
    specialty: "Interventional cardiology · 14 yrs",
    hospital: "Meridian Heart Institute · 3.2 km",
    when: "Tue 10:30",
    mode: "In-person",
    rating: "4.9",
  },
  {
    id: "so",
    initials: "SO",
    avatarClass: "bg-[var(--violet-soft)] text-[var(--violet)] border-[var(--violet)]/30",
    name: "Dr Samuel Okafor",
    specialty: "Electrophysiology · 11 yrs",
    hospital: "Northbridge Clinic · video only",
    when: "Today 16:00",
    mode: "Video",
    rating: "4.8",
  },
  {
    id: "ak",
    initials: "AK",
    avatarClass: "bg-[var(--cyan-soft)] text-[var(--cyan)] border-[var(--cyan)]/30",
    name: "Dr Amara Khan",
    specialty: "Preventive cardiology · 9 yrs",
    hospital: "City Care Hospital · 5.8 km",
    when: "Fri 09:15",
    mode: "Both",
    rating: "4.9",
  },
  {
    id: "lm",
    initials: "LM",
    avatarClass: "bg-[var(--green-soft)] text-[var(--green)] border-[var(--green)]/30",
    name: "Dr Luca Moretti",
    specialty: "General cardiology · 17 yrs",
    hospital: "Riverside Medical · 8.4 km",
    when: "Next: 6 Oct",
    mode: "In-person",
    rating: "4.7",
  },
  {
    id: "ps",
    initials: "PS",
    avatarClass: "bg-[var(--amber-soft)] text-[var(--amber)] border-[var(--amber)]/30",
    name: "Dr Priya Sundaram",
    specialty: "Heart failure · 12 yrs",
    hospital: "Meridian Heart Institute · 2.9 km",
    when: "Wed 11:00",
    mode: "Video",
    rating: "4.8",
  },
  {
    id: "rk",
    initials: "RK",
    avatarClass: "bg-[var(--red-soft)] text-[var(--red)] border-[var(--red)]/30",
    name: "Dr Rohan Kapoor",
    specialty: "Interventional cardiology · 20 yrs",
    hospital: "City Care Hospital · 6.1 km",
    when: "Thu 15:45",
    mode: "Both",
    rating: "5.0",
  },
];

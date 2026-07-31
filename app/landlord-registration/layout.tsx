import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Landlord Registration & Agreement Portal',
  description: 'Register your property on Ho Rentals. Review and sign platform agreement terms to list your room, hostel or apartment in Volta Region, Ghana.',
};

export default function LandlordRegistrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

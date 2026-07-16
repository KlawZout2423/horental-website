'use client';

import { usePathname } from 'next/navigation';

const AUTH_ROUTES = ['/login', '/register'];
const ADMIN_ROUTES = ['/admin'];

/**
 * Renders a spacer div that offsets content below the fixed navbar.
 * Hidden on auth and admin pages where the navbar itself is hidden.
 */
export default function NavbarSpacer() {
  const pathname = usePathname();

  const isNavbarHidden =
    AUTH_ROUTES.some((r) => pathname?.startsWith(r)) ||
    ADMIN_ROUTES.some((r) => pathname?.startsWith(r));

  if (isNavbarHidden) return null;

  return <div style={{ height: '70px' }} aria-hidden="true" />;
}

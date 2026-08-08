export type BackTarget = { to: string } | { history: true };

function roleHome(role?: string): string {
  if (role === 'ADMIN') return '/admin';
  if (role === 'SHOP') return '/shop';
  if (role === 'BUYER') return '/buyer';
  return '/';
}

/** Where the global back control should navigate for the current route. */
export function resolveBackTarget(pathname: string, role?: string): BackTarget | null {
  const vehicleShare = pathname.match(/^\/vehicles\/([^/]+)\/share$/);
  if (vehicleShare) return { to: `/vehicles/${vehicleShare[1]}` };

  const vehicleDetail = pathname.match(/^\/vehicles\/([^/]+)$/);
  if (vehicleDetail) return { to: '/' };

  const home = roleHome(role);

  if (pathname === home) return null;

  const ownerSub = ['/analytics', '/marketplace', '/shops', '/settings'];
  const shopSub = ['/analytics', '/settings'];
  const buyerSub = ['/settings'];

  if (role === 'OWNER' && ownerSub.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return { to: home };
  }
  if (role === 'SHOP' && shopSub.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return { to: home };
  }
  if (role === 'BUYER' && buyerSub.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return { to: home };
  }

  return null;
}

export function resolvePublicBackTarget(): BackTarget {
  return { history: true };
}

export function resolveAuthBackTarget(): BackTarget {
  return { to: '/' };
}

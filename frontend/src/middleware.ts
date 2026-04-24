import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Manager uchun granular permission map
const PATH_PERM_MAP: Array<{ prefix: string; perm: string }> = [
  { prefix: '/admin/payroll',     perm: 'view_payroll'  },
  { prefix: '/admin/reports',     perm: 'view_reports'  },
  { prefix: '/admin/workers',     perm: 'view_workers'  },
  { prefix: '/inventory/sklad',   perm: 'view_sklad'    },
  { prefix: '/inventory/bichuv',  perm: 'view_bichuv'   },
  { prefix: '/work-log',          perm: 'add_worklog'   },
];

function getPerms(request: NextRequest): string[] {
  const raw = request.cookies.get('userPerms')?.value;
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export function middleware(request: NextRequest) {
  const role = request.cookies.get('userRole')?.value?.toUpperCase();
  const path = request.nextUrl.pathname;

  const to = (url: string) => NextResponse.redirect(new URL(url, request.url));

  // ── /touch/* routes ───────────────────────────────────────────────────────
  if (path.startsWith('/touch')) {
    // Touch login is always accessible
    if (path.startsWith('/touch/login')) return NextResponse.next();

    // Not logged in → touch login
    if (!role) return to('/touch/login');

    // Admin cannot use touch UI
    if (role === 'ADMIN') return to('/');

    // CUTTER: only /touch/cut
    if (role === 'CUTTER') {
      return path.startsWith('/touch/cut') ? NextResponse.next() : to('/touch/cut');
    }

    // PACKER: only /touch/pack
    if (role === 'PACKER') {
      return path.startsWith('/touch/pack') ? NextResponse.next() : to('/touch/pack');
    }

    // MANAGER: all touch routes OK
    return NextResponse.next();
  }

  // ── Non-touch routes ──────────────────────────────────────────────────────

  // /login always accessible
  if (path.startsWith('/login')) return NextResponse.next();

  // Not logged in → /login
  if (!role) return to('/login');

  // CUTTER/PACKER: only touch, redirect everything else
  if (role === 'CUTTER') return to('/touch/cut');
  if (role === 'PACKER') return to('/touch/pack');

  // ADMIN: no /touch/* (already handled above)
  if (role === 'ADMIN') {
    return NextResponse.next();
  }

  // MANAGER: no /admin/*
  if (role === 'MANAGER') {
    if (path.startsWith('/admin')) return to('/');
    // Granular permission check
    const perms = getPerms(request);
    for (const { prefix, perm } of PATH_PERM_MAP) {
      if (path.startsWith(prefix) && !perms.includes(perm)) {
        return to('/unauthorized');
      }
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};

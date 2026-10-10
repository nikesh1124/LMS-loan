import { NextRequest, NextResponse } from 'next/server';

// First-line route guard based on the role cookie. Backend RBAC is the real enforcement.
export function proxy(req: NextRequest) {
  const role = req.cookies.get('lms_role')?.value;
  const { pathname } = req.nextUrl;
  const redirect = (to: string) => NextResponse.redirect(new URL(to, req.url));

  if (!role) return redirect('/login');

  if (pathname.startsWith('/apply') && role !== 'borrower') return redirect('/dashboard');
  if (pathname.startsWith('/dashboard')) {
    if (role === 'borrower') return redirect('/apply');
    const module = pathname.split('/')[2];
    if (module && role !== 'admin' && module !== role) return redirect(`/dashboard/${role}`);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/apply/:path*', '/dashboard/:path*'] };

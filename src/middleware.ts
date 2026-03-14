import { NextResponse, type NextRequest } from 'next/server'

const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co'

export async function middleware(request: NextRequest) {
  if (DEMO_MODE) {
    const isLoggedIn = request.cookies.get('kira_session')?.value === 'active'

    if (!isLoggedIn && !request.nextUrl.pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (isLoggedIn && request.nextUrl.pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url))
    }

    return NextResponse.next()
  }

  // Production: use Supabase auth
  const { updateSession } = await import('@/lib/supabase/middleware')
  return await updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}


import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getServerSupabaseUrl } from './config'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabaseUrl = getServerSupabaseUrl();
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        return response;
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => {
                        request.cookies.set(name, value)
                    })
                    response = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { session },
    } = await supabase.auth.getSession()

    const user = session?.user ?? null

    // ROUTE PROTECTION LOGIC
    const path = request.nextUrl.pathname

    // Allow E2E tests to bypass authentication
    const bypassKey = request.headers.get('x-e2e-bypass');
    const e2eBypassKey = process.env.E2E_BYPASS_KEY;
    if (process.env.NODE_ENV !== 'production' && e2eBypassKey && bypassKey === e2eBypassKey) {
        return response;
    }

    // 1. Protect /admin routes
    if (path.startsWith('/admin') && !user) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/login'
        return NextResponse.redirect(redirectUrl)
    }

    // 2. Redirect logged-in users away from /login
    if (path === '/login' && user) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/admin'
        return NextResponse.redirect(redirectUrl)
    }

    return response
}

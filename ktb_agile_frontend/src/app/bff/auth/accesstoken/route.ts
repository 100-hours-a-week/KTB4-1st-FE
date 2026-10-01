import type { NextRequest } from 'next/server'

const backendUrl = process.env.BACKEND_API_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'http://springboot:8080'
    : 'http://127.0.0.1:8080')

export async function POST(request: NextRequest) {
  const refreshToken = request.cookies.get('refresh_token')?.value

  try {
    const response = await fetch(`${backendUrl}/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: `refresh_token=${refreshToken || ''}`,
      },
      cache: 'no-store',
    })

    return Response.json(await response.json(), {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return Response.json(
      { data: null, error: { message: '인증 서버에 연결할 수 없습니다.' } },
      { status: 502 },
    )
  }
}

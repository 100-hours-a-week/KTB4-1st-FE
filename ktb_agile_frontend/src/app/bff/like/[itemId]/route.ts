import { AUTH_ERRORS } from '@/constants/errors/auth'
import axios from 'axios'

const backendUrl = (
  process.env.BACKEND_API_BASE_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'http://springboot:8080'
    : 'http://127.0.0.1:8080')
).replace(/\/+$/, '')

type RouteContext = {
  params: Promise<{ itemId: string }>
}

async function proxyLikeRequest(
  request: Request,
  itemId: string,
  method: 'POST' | 'DELETE',
) {
  const authorization = request.headers.get('Authorization')

  if (!authorization) {
    return Response.json(
      { data: null, error: { message: AUTH_ERRORS.LOGIN_REQUIRED } },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  try {
    const response = await axios.request({
      url: `${backendUrl}/items/${encodeURIComponent(itemId)}/likes`,
      method,
      headers: {
        Authorization: authorization,
        Accept: 'application/json',
      },
      validateStatus: () => true,
    })

    if (response.status === 204) {
      return new Response(null, {
        status: 204,
        headers: { 'Cache-Control': 'no-store' },
      })
    }

    return Response.json(response.data, {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return Response.json(
      { data: null, error: { message: AUTH_ERRORS.SERVER_UNAVAILABLE } },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const { itemId } = await params
  return proxyLikeRequest(request, itemId, 'POST')
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const { itemId } = await params
  return proxyLikeRequest(request, itemId, 'DELETE')
}

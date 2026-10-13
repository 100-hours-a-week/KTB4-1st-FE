import { AUTH_ERRORS } from '@/constants/errors/auth'

type AuthenticatedHandler = (
  request: Request,
  authorization: string,
) => Promise<Response>

export function withAuth(handler: AuthenticatedHandler) {
  return async (request: Request) => {
    const authorization = request.headers.get('Authorization')

    if (!authorization?.startsWith('Bearer ')) {
      return Response.json(
        {
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: AUTH_ERRORS.LOGIN_REQUIRED,
            details: [],
          },
        },
        { status: 401, headers: { 'Cache-Control': 'no-store' } },
      )
    }

    return handler(request, authorization)
  }
}

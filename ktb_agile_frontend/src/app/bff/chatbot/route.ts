import { BACKEND_URL } from '@/config/backend'
import { withAuth } from '@/utils/with-auth'

async function askChatbot(request: Request, authorization: string) {
  try {
    const response = await fetch(`${BACKEND_URL}/chatbot/ask`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: await request.text(),
      cache: 'no-store',
    })

    return Response.json(await response.json(), {
      status: response.status,
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return Response.json(
      {
        data: null,
        error: {
          code: 'BAD_GATEWAY',
          message: '챗봇 답변을 불러오지 못했습니다.',
          details: [],
        },
      },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

export const POST = withAuth(askChatbot)

export function getUserIdFromAccessToken(accessToken: string) {
  try {
    const payloadPart = accessToken.split('.')[1]
    if (!payloadPart) return null

    const normalizedPayload = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
    const paddedPayload = normalizedPayload.padEnd(
      Math.ceil(normalizedPayload.length / 4) * 4,
      '=',
    )
    const payload = JSON.parse(window.atob(paddedPayload)) as { sub?: string }
    const userId = Number(payload.sub)

    return Number.isSafeInteger(userId) && userId > 0 ? userId : null
  } catch {
    return null
  }
}

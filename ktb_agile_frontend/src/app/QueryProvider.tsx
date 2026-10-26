'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [client] = useState(() => {
    const queryClient = new QueryClient()
    queryClient.setQueryDefaults(['joined-groups'], { gcTime: 30 * 60 * 1000 })
    return queryClient
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useRef, useState, type FormEvent } from 'react'
import Navbar from '@/components/common/navbar/Navbar'
import styles from './page.module.css'

type Message = {
  id: string
  side: 'mine' | 'theirs'
  content: string
  time: string
}

const sampleMessages: Message[] = [
  {
    id: 'sample-1',
    side: 'theirs',
    content: '(사용자2) 게시글 관련 메시지1',
    time: '10:06',
  },
  {
    id: 'sample-2',
    side: 'mine',
    content: '(사용자1) 게시글 관련 메시지2',
    time: '10:08',
  },
]

function timeLabel(date: Date) {
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

export default function ChatRoomPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const title = searchParams.get('title') ?? '게시글 제목1'
  const group = searchParams.get('group') ?? '그룹1'
  const otherUser = searchParams.get('user') ?? '사용자2'
  const image = searchParams.get('image')
  const isSeller = searchParams.get('direction') !== 'SENT'
  const [draft, setDraft] = useState('')
  const messagesRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>(() => {
    const lastMessage = searchParams.get('lastMessage')
    if (!lastMessage) return searchParams.has('title') ? [] : sampleMessages
    const sentByOtherUser =
      searchParams.get('senderId') === searchParams.get('userId')
    const sentAt = searchParams.get('lastMessageAt')
    return [
      {
        id: 'last-message',
        side: sentByOtherUser ? 'theirs' : 'mine',
        content: lastMessage,
        time: sentAt ? timeLabel(new Date(sentAt)) : '',
      },
    ]
  })
  const [menuOpen, setMenuOpen] = useState(false)
  const [exchangeStatus, setExchangeStatus] = useState<
    'available' | 'completed' | 'rejected'
  >(() => {
    const status = searchParams.get('status')
    return status === 'COMPLETED'
      ? 'completed'
      : status === 'REJECTED'
        ? 'rejected'
        : 'available'
  })

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = draft.trim()
    if (!content) return
    setMessages((current) => [
      ...current,
      {
        id: `local-${Date.now()}`,
        side: 'mine',
        content,
        time: timeLabel(new Date()),
      },
    ])
    setDraft('')
    requestAnimationFrame(() => {
      messagesRef.current?.scrollTo({
        top: messagesRef.current.scrollHeight,
        behavior: 'smooth',
      })
    })
  }

  return (
    <>
      <section className={styles.page} aria-label="채팅방">
        <header className={styles.header}>
          <button
            className={styles.iconButton}
            type="button"
            onClick={() => router.push('/pages/chat')}
            aria-label="채팅 목록으로 돌아가기"
          >
            <img src="/figma/chat/back.svg" alt="" width="24" height="24" />
          </button>
          <h1>채팅</h1>
          <div className={styles.menuAnchor}>
            <button
              className={styles.iconButton}
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="채팅방 메뉴"
              aria-expanded={menuOpen}
            >
              <img src="/figma/chat/more.svg" alt="" width="24" height="24" />
            </button>
            {menuOpen && (
              <div className={styles.menu}>
                <button
                  type="button"
                  onClick={() => router.push('/pages/chat')}
                >
                  채팅 목록으로 이동
                </button>
              </div>
            )}
          </div>
        </header>

        <div className={styles.content}>
          <article className={styles.productCard}>
            <div className={styles.productImage}>
              {image ? (
                <img className={styles.actualProductImage} src={image} alt="" />
              ) : (
                <img
                  src="/figma/chat/product-image-icon.svg"
                  alt=""
                  width="18.5"
                  height="18.5"
                />
              )}
            </div>
            <div className={styles.productDetails}>
              <div className={styles.productTitleRow}>
                <strong>상품명: {title}</strong>
                <span>
                  {exchangeStatus === 'available'
                    ? '거래 가능'
                    : exchangeStatus === 'completed'
                      ? '거래 완료'
                      : '거래 거절'}
                </span>
              </div>
              <p>그룹: {group}</p>
              <p>상대: {otherUser}</p>
            </div>
            {isSeller && exchangeStatus === 'available' && (
              <div className={styles.exchangeActions}>
                <button
                  type="button"
                  onClick={() => setExchangeStatus('completed')}
                >
                  교환 완료
                </button>
                <button
                  type="button"
                  onClick={() => setExchangeStatus('rejected')}
                >
                  교환 거절
                </button>
              </div>
            )}
          </article>

          <div className={styles.messages} aria-live="polite" ref={messagesRef}>
            <div className={styles.systemGroup}>
              <time>오늘 10:05</time>
              <div className={styles.systemCard}>
                <strong>
                  (시스템) 교환 요청이{' '}
                  {isSeller ? '접수되었습니다.' : '전송되었습니다.'}
                </strong>
                <p>요청 물건: {title}</p>
                <p>요청 수량: 1개</p>
                <div className={styles.exchangeDetails}>
                  <div className={styles.exchangeItem}>
                    <img
                      src="/figma/chat/target-placeholder.svg"
                      alt=""
                      width="44"
                      height="44"
                    />
                    <strong>{title}</strong>
                    <span>보유 수량: 3</span>
                  </div>
                  <div className={styles.exchangeArrows} aria-hidden="true">
                    <img
                      src="/figma/chat/back.svg"
                      alt=""
                      width="24"
                      height="24"
                    />
                    <img
                      src="/figma/chat/arrow-right.svg"
                      alt=""
                      width="24"
                      height="24"
                    />
                  </div>
                  <div className={styles.exchangeItem}>
                    <img
                      src="/figma/chat/offered-placeholder.svg"
                      alt=""
                      width="44"
                      height="44"
                    />
                    <strong>물건 1, 물건 2, ...</strong>
                    <span>보유 수량: 8</span>
                  </div>
                </div>
              </div>
              {isSeller && (
                <div className={styles.systemCard}>
                  <strong>(시스템) 교환 상태에 따른 버튼 설정</strong>
                  <p className={styles.systemExplanation}>
                    채팅을 시작하시면 교환을 진행하는 것으로 간주됩니다.
                    <br />
                    ‘펼쳐보기’를 통해 정확한 거래 사항을 확인할 수 있으며,
                    <br />
                    ‘교환 거절’ 버튼을 통해 거절할 수 있습니다.
                    <br />
                    거래 완료 시 ‘교환 완료’ 버튼을 통해 끝낼 수 있습니다.
                  </p>
                </div>
              )}
            </div>

            {messages.map((message) => (
              <div
                key={message.id}
                className={`${styles.messageRow} ${message.side === 'mine' ? styles.mine : styles.theirs}`}
              >
                {message.side === 'theirs' && (
                  <span className={styles.avatar} aria-hidden="true">
                    {otherUser.charAt(0)}
                  </span>
                )}
                {message.side === 'mine' && <time>{message.time}</time>}
                <p className={styles.bubble}>{message.content}</p>
                {message.side === 'theirs' && <time>{message.time}</time>}
              </div>
            ))}
          </div>
        </div>

        <form className={styles.composer} onSubmit={sendMessage}>
          <label className={styles.visuallyHidden} htmlFor="chat-message">
            메시지
          </label>
          <input
            id="chat-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="메시지를 입력하세요..."
            autoComplete="off"
          />
          <button
            type="submit"
            aria-label="메시지 보내기"
            disabled={!draft.trim()}
          >
            <img src="/figma/chat/send.svg" alt="" width="20" height="20" />
          </button>
        </form>
      </section>
      <Navbar />
    </>
  )
}

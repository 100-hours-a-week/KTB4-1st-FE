import styles from './HalloweenDecoration.module.css'

type HalloweenDecorationProps = {
  kind: 'pumpkin' | 'candy' | 'web'
  className?: string
}

/** Decorative only; the Halloween theme controls visibility. */
export default function HalloweenDecoration({
  kind,
  className = '',
}: HalloweenDecorationProps) {
  return (
    <span
      className={`${styles.decoration} ${styles[kind]} ${className}`}
      aria-hidden="true"
    >
      {kind === 'pumpkin' && (
        <svg viewBox="0 0 100 90" fill="none" focusable="false">
          <path
            d="M47 25C44 14 50 5 59 5L62 14C54 14 53 20 54 26"
            fill="#8b8560"
          />
          <path
            d="M50 27C29 13 7 30 8 54C9 77 29 88 50 81C71 88 91 77 92 54C93 30 71 13 50 27Z"
            fill="#ed8b42"
            stroke="#d37538"
            strokeWidth="2"
          />
          <ellipse cx="50" cy="54" rx="24" ry="29" fill="#ffb568" />
          <path
            d="M35 30C21 44 24 69 34 77M65 30C79 44 76 69 66 77"
            stroke="#cf6b35"
            strokeOpacity=".4"
            strokeWidth="2"
          />
          <path
            d="M25 48L36 36L41 51ZM59 51L64 36L75 48ZM28 61L40 65L46 60L52 66L59 60L65 65L73 61C65 79 36 78 28 61Z"
            fill="#38213e"
          />
          <path
            d="M18 38C21 31 26 29 30 29"
            stroke="#ffe4b7"
            strokeWidth="4"
            strokeLinecap="round"
            opacity=".7"
          />
        </svg>
      )}
      {kind === 'candy' && (
        <svg viewBox="0 0 120 70" fill="none" focusable="false">
          <g transform="rotate(-16 60 35)">
            <path
              d="M37 26L10 12L15 34L8 55L37 45Z"
              fill="#b894cf"
              stroke="#9773b0"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M83 26L110 12L105 34L112 55L83 45Z"
              fill="#b894cf"
              stroke="#9773b0"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path
              d="M17 23L33 32M17 46L33 39M103 23L87 32M103 46L87 39"
              stroke="#f2ddff"
              strokeOpacity=".65"
              strokeWidth="2"
            />
            <rect
              x="32"
              y="13"
              width="56"
              height="44"
              rx="19"
              fill="#ffcc7a"
              stroke="#e4a653"
              strokeWidth="1.5"
            />
            <path
              d="M45 15L60 56M62 14L77 54"
              stroke="#ee8a48"
              strokeWidth="10"
            />
            <path
              d="M43 21C52 17 66 18 74 21"
              stroke="#fff3cd"
              strokeWidth="3"
              strokeLinecap="round"
              opacity=".8"
            />
          </g>
        </svg>
      )}
      {kind === 'web' && (
        <svg viewBox="0 0 120 120" fill="none" focusable="false">
          <path
            d="M120 0H0M120 0L7 48M120 0L35 85M120 0L72 113M120 0V120M89 0Q89 13 91 12Q96 25 108 29Q108 31 120 31M59 0Q58 24 64 24Q71 48 96 56Q96 62 120 61M29 0Q29 34 37 36Q48 71 84 83Q86 91 120 91M1 0Q0 46 9 47Q26 95 72 111Q74 120 120 119"
            stroke="currentColor"
            strokeWidth="1.4"
          />
          <path
            d="M25 41V67M18 70Q25 60 32 70M16 76L22 73M34 76L28 73"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <ellipse cx="25" cy="71" rx="4" ry="6" fill="currentColor" />
        </svg>
      )}
    </span>
  )
}

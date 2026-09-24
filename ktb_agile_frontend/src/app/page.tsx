import Link from 'next/link'

export default function Home() {
  return (
    <section className="home-page">
      <h1 className="service-title">바꾸까</h1>
      <Link className="join-button" href="/auth/login">
        함께 하기
      </Link>
    </section>
  )
}

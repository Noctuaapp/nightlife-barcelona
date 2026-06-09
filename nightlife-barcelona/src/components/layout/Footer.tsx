import Link from "next/link"

export default function Footer() {
  return (
    <footer className="py-8 text-center text-sm text-zinc-500">
      <div className="mx-auto mb-8 w-[80%] max-w-5xl border-t border-zinc-700" />

      <div className="flex flex-wrap justify-center gap-4 px-4">
        <Link href="/clubs" className="transition hover:text-white">
          Clubs
        </Link>

        <Link href="/events" className="transition hover:text-white">
          Events
        </Link>

        <Link href="/essentials" className="transition hover:text-white">
          Essentials
        </Link>

        <Link href="/contact" className="transition hover:text-white">
          Contact
        </Link>

        <Link href="/faq" className="transition hover:text-white">
          FAQ
        </Link>

        <Link href="/privacy" className="transition hover:text-white">
          Privacy
        </Link>

        <Link href="/terms" className="transition hover:text-white">
          Terms
        </Link>
      </div>

      <p className="mt-4 text-xs text-zinc-600">
        © 2026 Noctua
      </p>
    </footer>
  )
}
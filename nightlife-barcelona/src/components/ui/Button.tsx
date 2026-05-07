"use client"

interface ButtonProps {
  children: React.ReactNode
  variant?: "primary" | "secondary"
}

export default function Button({
  children,
  variant = "primary",
}: ButtonProps) {

  const styles = {
    primary:
      "rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition duration-300 hover:scale-[1.03]",

    secondary:
      "rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-zinc-300 transition duration-300 hover:bg-white/10",
  }

  return (
    <button className={styles[variant]}>
      {children}
    </button>
  )
}
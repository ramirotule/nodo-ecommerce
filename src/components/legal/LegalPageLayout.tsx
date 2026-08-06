import { Scale } from 'lucide-react'

interface Props {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export default function LegalPageLayout({ title, subtitle, children }: Props) {
  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="flex flex-col items-center text-center mb-14">
        <div className="w-12 h-12 rounded-full border-2 border-gold flex items-center justify-center mb-5">
          <Scale size={22} className="text-gold" />
        </div>
        <h1 className="font-serif text-4xl md:text-5xl text-white mb-3">{title}</h1>
        {subtitle && (
          <p className="text-luxury-gray-light text-sm max-w-xl">{subtitle}</p>
        )}
      </div>
      {children}
    </main>
  )
}

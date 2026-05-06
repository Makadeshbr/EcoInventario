'use client'

import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function NewsletterSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [email, setEmail]         = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const items = contentRef.current?.querySelectorAll('.reveal-item')
      if (items?.length) {
        gsap.fromTo(
          items,
          { y: 32, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 0.85, stagger: 0.15, ease: 'power3.out',
            scrollTrigger: { trigger: sectionRef.current, start: 'top 72%' },
          },
        )
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setSubmitted(true)
  }

  return (
    <section ref={sectionRef} id="newsletter" className="relative bg-forest py-24 lg:py-32 overflow-hidden">
      {/* Gradiente de profundidade superior */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/25 to-transparent" />

      {/* Botanical SVGs — puramente gráficos, sem foto com fundo externo */}
      <svg
        viewBox="0 0 200 400"
        fill="none"
        className="absolute left-0 top-1/2 -translate-y-1/2 h-full max-h-80 opacity-[0.12] pointer-events-none select-none"
        aria-hidden="true"
      >
        <path d="M-20 380 C20 300 55 220 80 150 C105 82 110 40 105 5"
          stroke="#2A6040" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M52 240 C25 222 -5 231 -14 254 C18 226 48 236 52 240 Z" fill="#1C4D35" />
        <path d="M62 215 C88 198 114 207 116 229 C90 204 64 212 62 215 Z" fill="#194430" />
        <path d="M70 190 C46 174 22 182 18 204 C46 177 67 186 70 190 Z" fill="#1C4D35" />
        <path d="M78 165 C103 149 127 158 127 180 C103 155 80 162 78 165 Z" fill="#194430" />
        <path d="M86 142 C64 127 42 134 40 155 C65 129 83 138 86 142 Z" fill="#1C4D35" />
      </svg>

      <svg
        viewBox="0 0 200 400"
        fill="none"
        className="absolute right-0 top-1/2 -translate-y-1/2 h-full max-h-80 opacity-[0.12] pointer-events-none select-none"
        aria-hidden="true"
        style={{ transform: 'translateY(-50%) scaleX(-1)' }}
      >
        <path d="M-20 380 C20 300 55 220 80 150 C105 82 110 40 105 5"
          stroke="#2A6040" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M52 240 C25 222 -5 231 -14 254 C18 226 48 236 52 240 Z" fill="#1C4D35" />
        <path d="M62 215 C88 198 114 207 116 229 C90 204 64 212 62 215 Z" fill="#194430" />
        <path d="M70 190 C46 174 22 182 18 204 C46 177 67 186 70 190 Z" fill="#1C4D35" />
        <path d="M78 165 C103 149 127 158 127 180 C103 155 80 162 78 165 Z" fill="#194430" />
        <path d="M86 142 C64 127 42 134 40 155 C65 129 83 138 86 142 Z" fill="#1C4D35" />
      </svg>

      {/* Anel dourado decorativo de fundo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[480px] h-[480px] rounded-full border border-gold/[0.06]" />
        <div className="absolute w-[640px] h-[640px] rounded-full border border-gold/[0.04]" />
      </div>

      <div className="relative max-w-2xl mx-auto px-6 text-center" ref={contentRef}>
        <div className="reveal-item flex items-center justify-center gap-3 mb-6">
          <span className="h-px w-10 bg-gold/40" />
          <span className="section-label text-gold/60">Newsletter</span>
          <span className="h-px w-10 bg-gold/40" />
        </div>

        <h2 className="reveal-item font-serif text-4xl lg:text-5xl text-cream font-light leading-[1.15] mb-5">
          Receba novidades da<br />Comunidade Plantaê
        </h2>

        <p className="reveal-item text-sand/55 text-base leading-[1.8] mb-10 max-w-[44ch] mx-auto">
          Histórias, projetos e oportunidades para quem acredita em um futuro mais verde.
        </p>

        {submitted ? (
          <div className="reveal-item inline-flex items-center gap-3 px-7 py-4 rounded-full bg-moss/50 border border-gold/25 text-cream text-sm">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M4 10L8 14L16 6" stroke="#F5B93F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Obrigado! Você está na lista.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="reveal-item flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com.br"
              required
              className="flex-1 px-5 py-3.5 rounded-full bg-moss/35 border border-white/[0.09] text-cream placeholder-sand/35 text-sm focus:outline-none focus:border-gold/35 focus:bg-moss/55 transition-all duration-300"
            />
            <button
              type="submit"
              aria-label="Inscrever email"
              className="btn-gold grid h-12 w-12 flex-shrink-0 place-items-center self-center rounded-full bg-gold text-forest sm:self-auto"
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8H13M13 8L9 4M13 8L9 12"
                  stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        )}

        <p className="reveal-item text-sand/30 text-xs mt-5">
          Sem spam. Cancele quando quiser.
        </p>
      </div>
    </section>
  )
}

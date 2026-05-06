'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function AboutSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const imageRef   = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        imageRef.current,
        { y: 50, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 1, ease: 'power3.out',
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top 72%',
          },
        },
      )

      const items = contentRef.current?.querySelectorAll('.reveal-item')
      if (items?.length) {
        gsap.fromTo(
          items,
          { y: 36, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: 'power3.out',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top 68%',
            },
          },
        )
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="sobre-nos" className="relative bg-cream overflow-hidden py-24 lg:py-36">
      {/* Botanical SVG decorativo — fundo creme, sem fotos com fundo externo */}
      <svg
        viewBox="0 0 300 500"
        fill="none"
        className="absolute -right-8 top-1/2 -translate-y-1/2 h-[70%] opacity-[0.07] pointer-events-none select-none"
        aria-hidden="true"
      >
        <path d="M280 490 C240 400 195 310 160 220 C128 138 110 75 115 10"
          stroke="#647A4B" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M195 330 C220 308 250 316 252 340 C228 316 197 327 195 330 Z" fill="#8AAB6A" />
        <path d="M178 300 C155 278 128 286 126 308 C150 284 175 297 178 300 Z" fill="#7A9C5A" />
        <path d="M168 270 C192 250 220 258 220 280 C196 256 170 267 168 270 Z" fill="#8AAB6A" />
        <path d="M153 240 C132 220 107 228 107 250 C130 226 150 237 153 240 Z" fill="#7A9C5A" />
        <path d="M144 212 C166 192 192 200 190 222 C167 198 146 209 144 212 Z" fill="#8AAB6A" />
        <path d="M132 182 C112 163 88 170 88 192 C110 168 129 179 132 182 Z" fill="#7A9C5A" />
      </svg>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* ── Left: arched image ── */}
          <div ref={imageRef} className="relative flex justify-center lg:justify-start">
            <div className="relative" style={{ maxWidth: '400px', width: '100%' }}>
              {/* Arch container */}
              <div
                className="relative overflow-hidden shadow-2xl shadow-earth/20"
                style={{ borderRadius: '200px 200px 24px 24px', aspectRatio: '3/4' }}
              >
                <Image
                  src="/images/ype-arco.png"
                  alt="Ipê amarelo em moldura arqueada — Comunidade Plantaê"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 90vw, 400px"
                />
              </div>

              {/* Decorative ring gold */}
              <div className="absolute -bottom-5 -right-5 w-28 h-28 rounded-full border border-gold/30 pointer-events-none" />
              {/* Decorative ring earth */}
              <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full border border-earth/20 pointer-events-none" />
              {/* Gold corner accent */}
              <div className="absolute top-8 -left-3 w-6 h-6 border-l-2 border-t-2 border-gold/50 pointer-events-none" />
            </div>
          </div>

          {/* ── Right: content ── */}
          <div ref={contentRef} className="flex flex-col gap-6">
            <div className="reveal-item flex items-center gap-3">
              <span className="h-px w-8 bg-olive/60" />
              <span className="section-label text-olive">Sobre Nós</span>
            </div>

            <h2 className="reveal-item font-serif text-4xl lg:text-[2.8rem] text-dark font-light leading-[1.15]">
              Conectamos pessoas,<br />ciência e natureza
            </h2>

            <p className="reveal-item text-dark/55 text-base lg:text-[1.05rem] leading-[1.8] max-w-[50ch]">
              A Comunidade Plantaê é uma organização sem fins lucrativos que atua na conservação
              da biodiversidade, na educação ambiental e no fortalecimento de comunidades para
              práticas sustentáveis.
            </p>

            <div className="reveal-item divider-botanical" />

            <p className="reveal-item text-dark/45 text-sm leading-[1.75] max-w-[48ch]">
              Acreditamos que a transformação começa pelo conhecimento. Cada semente plantada
              é um elo entre pessoas, ciência e o futuro que queremos construir juntos.
            </p>

            <div className="reveal-item mt-2">
              <a
                href="#causas"
                className="inline-flex items-center gap-2.5 px-6 py-3 border border-olive/50 text-dark text-sm rounded-full hover:bg-olive hover:text-cream hover:border-olive transition-all duration-300 group"
              >
                Saiba mais sobre nós
                <svg
                  width="16" height="16" viewBox="0 0 16 16" fill="none"
                  className="group-hover:translate-x-1 transition-transform duration-300"
                >
                  <path d="M3 8H13M13 8L9 4M13 8L9 12"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

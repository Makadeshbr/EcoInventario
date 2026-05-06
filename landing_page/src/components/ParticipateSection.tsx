'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const cards = [
  {
    image:       '/images/segurando-planta.png',
    category:    'Voluntariado',
    title:       'Seja voluntário',
    description: 'Doe seu tempo e talento para projetos que transformam vidas e ecossistemas.',
    link:        'Saiba como participar →',
    position:    'center',
  },
  {
    image:       '/images/doacao.png',
    category:    'Doação',
    title:       'Faça uma doação',
    description: 'Sua contribuição fortalece nossas ações e projetos de restauração ecológica.',
    link:        'Doe agora →',
    position:    'center top',
  },
  {
    image:       '/images/plantado-joao.png',
    category:    'Parceria',
    title:       'Empresas parceiras',
    description: 'Construa junto conosco um futuro mais sustentável para pessoas e natureza.',
    link:        'Fale com a gente →',
    position:    '40% center',
  },
]

export default function ParticipateSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const leftRef    = useRef<HTMLDivElement>(null)
  const cardsRef   = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const leftItems = leftRef.current?.querySelectorAll('.reveal-left')
      if (leftItems?.length) {
        gsap.fromTo(
          leftItems,
          { x: -28, opacity: 0 },
          {
            x: 0, opacity: 1, duration: 0.85, stagger: 0.15, ease: 'power3.out',
            scrollTrigger: { trigger: sectionRef.current, start: 'top 72%' },
          },
        )
      }

      const cardEls = cardsRef.current?.querySelectorAll('.participate-card')
      if (cardEls?.length) {
        gsap.fromTo(
          cardEls,
          { y: 48, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 0.8, stagger: 0.16, ease: 'power3.out',
            scrollTrigger: { trigger: cardsRef.current, start: 'top 75%' },
          },
        )
      }
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="participe" className="bg-cream py-24 lg:py-36 relative overflow-hidden">
      {/* Botanical SVG decorativo — canto inferior direito */}
      <svg
        viewBox="0 0 300 300"
        fill="none"
        className="absolute -bottom-12 -right-12 w-56 opacity-[0.06] pointer-events-none select-none"
        aria-hidden="true"
      >
        <path d="M290 290 C230 240 170 180 130 110 C90 45 50 10 10 -10" stroke="#264C38" strokeWidth="2" strokeLinecap="round" />
        <path d="M175 200 C198 175 228 180 235 205 C210 180 177 197 175 200 Z" fill="#264C38" />
        <path d="M155 175 C130 152 100 157 96 180 C122 155 152 172 155 175 Z" fill="#264C38" />
        <path d="M145 148 C168 125 196 130 200 154 C176 130 147 145 145 148 Z" fill="#264C38" />
        <path d="M128 122 C105 100 76 106 74 128 C98 105 125 119 128 122 Z" fill="#264C38" />
      </svg>

      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        <div className="grid lg:grid-cols-5 gap-16 lg:gap-20 items-start">

          {/* ── Left — 2 cols ── */}
          <div ref={leftRef} className="lg:col-span-2 lg:sticky lg:top-32">
            <div className="reveal-left flex items-center gap-3 mb-6">
              <span className="h-px w-8 bg-olive/60" />
              <span className="section-label text-olive">Participe</span>
            </div>

            <h2 className="reveal-left font-serif text-4xl lg:text-[2.8rem] text-dark font-light leading-[1.12] mb-6">
              Pequenas ações,<br />grandes mudanças
            </h2>

            <p className="reveal-left text-dark/55 text-base leading-[1.8] max-w-[40ch] mb-10">
              Você pode fazer parte dessa transformação. Seu apoio ajuda a multiplicar o
              impacto positivo que geramos no planeta.
            </p>

            <div className="reveal-left divider-botanical mb-8" />

            <a
              href="#contato"
              className="reveal-left btn-gold inline-flex items-center gap-2 px-6 py-3.5 bg-forest text-cream font-semibold text-sm rounded-full hover:bg-dark transition-colors duration-300"
            >
              Quero contribuir
            </a>
          </div>

          {/* ── Right — 3 cols — cards ── */}
          {/* Todas as imagens têm fundo escuro/natural — integração real com o card */}
          <div ref={cardsRef} className="lg:col-span-3 grid sm:grid-cols-3 gap-5">
            {cards.map((card) => (
              <div
                key={card.title}
                className="participate-card card-premium group rounded-lg overflow-hidden shadow-sm border border-dark/[0.08] bg-forest"
              >
                {/* Imagem com gradiente que emerge para o conteúdo — sem borda dura */}
                <div className="relative h-52 overflow-hidden">
                  <Image
                    src={card.image}
                    alt={card.title}
                    fill
                    className="object-cover img-zoom"
                    style={{ objectPosition: card.position }}
                    sizes="(max-width: 640px) 90vw, 220px"
                  />
                  {/* Gradient que derrama para baixo — a imagem "vira" o card */}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-forest/80" />
                </div>

                {/* Conteúdo no mesmo fundo escuro que a imagem */}
                <div className="bg-moss/40 px-5 py-5">
                  <span className="text-[0.6rem] text-gold/70 uppercase block mb-2">
                    {card.category}
                  </span>
                  <h3 className="font-serif text-lg text-cream font-light mb-2 leading-snug">
                    {card.title}
                  </h3>
                  <p className="text-sand/55 text-xs leading-[1.75] mb-4">
                    {card.description}
                  </p>
                  <a
                    href="#contato"
                    className="text-gold/70 text-xs font-medium hover:text-gold transition-colors duration-300 group-hover:underline underline-offset-2"
                  >
                    {card.link}
                  </a>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}

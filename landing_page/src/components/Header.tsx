'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { gsap } from 'gsap'

const navItems = [
  { label: 'Início',        href: '/#inicio'        },
  { label: 'Sobre nós',     href: '/#sobre-nos'     },
  { label: 'EcoInventário', href: '/#ecoinventario' },
  { label: 'Projetos',      href: '/#projetos'      },
  { label: 'Impacto',       href: '/#impacto'       },
  { label: 'Contato',       href: '/#contato'       },
]

export default function Header() {
  const [scrolled, setScrolled]  = useState(false)
  const [menuOpen, setMenuOpen]  = useState(false)
  const headerRef                = useRef<HTMLElement>(null)
  const mobileMenuRef            = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 72)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!headerRef.current) return
    gsap.fromTo(
      headerRef.current,
      { y: -24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, delay: 0.15, ease: 'power3.out' },
    )
  }, [])

  useEffect(() => {
    if (!mobileMenuRef.current) return
    if (menuOpen) {
      gsap.fromTo(mobileMenuRef.current,
        { height: 0, opacity: 0 },
        { height: 'auto', opacity: 1, duration: 0.45, ease: 'power3.out' },
      )
    } else {
      gsap.to(mobileMenuRef.current, { height: 0, opacity: 0, duration: 0.3, ease: 'power3.in' })
    }
  }, [menuOpen])

  return (
    <header
      ref={headerRef}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${
        scrolled || menuOpen
          ? 'bg-forest/95 backdrop-blur-md border-b border-white/[0.07] shadow-xl shadow-black/20'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex items-center justify-between h-20">

          {/* ── Logo — imagem real com fundo transparente ── */}
          <a href="/#inicio" className="flex-shrink-0 group">
            <div className="relative h-12 w-48 lg:w-52 group-hover:opacity-90 transition-opacity duration-300">
              <Image
                src="/images/logo-header.png"
                alt="Comunidade Plantaê — Comunidade de Ecologia e Sustentabilidade"
                fill
                className="object-contain object-left"
                priority
                sizes="208px"
              />
            </div>
          </a>

          {/* ── Nav desktop ── */}
          <nav className="hidden lg:flex items-center gap-7">
            {navItems.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-[0.8rem] text-sand/75 hover:text-cream transition-colors duration-300 relative group"
              >
                {label}
                <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-gold transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </nav>

          {/* ── CTA desktop ── */}
          <div className="hidden lg:block">
            <a
              href="/#contato"
              className="btn-gold px-5 py-2.5 bg-gold text-forest font-semibold text-[0.8rem] rounded-full"
            >
              Doe Agora
            </a>
          </div>

          {/* ── Hambúrguer mobile ── */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-controls="menu-mobile"
            className="lg:hidden text-cream p-2 flex flex-col gap-1.5"
          >
            <span className={`block w-6 h-px bg-current origin-center transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
            <span className={`block w-6 h-px bg-current transition-all duration-300 ${menuOpen ? 'opacity-0 scale-x-0' : ''}`} />
            <span className={`block w-6 h-px bg-current origin-center transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
          </button>
        </div>

        {/* ── Menu mobile ── */}
        <div id="menu-mobile" ref={mobileMenuRef} className="lg:hidden overflow-hidden h-0 opacity-0">
          <div className="py-6 space-y-1 border-t border-white/10">
            {navItems.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="block py-3 px-2 text-sand/80 hover:text-cream text-sm transition-colors border-b border-white/5"
              >
                {label}
              </a>
            ))}
            <div className="pt-4">
              <a
                href="/#contato"
                onClick={() => setMenuOpen(false)}
                className="inline-block px-6 py-3 bg-gold text-forest font-semibold text-sm rounded-full"
              >
                Doe Agora
              </a>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

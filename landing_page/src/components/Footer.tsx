import Image from 'next/image'

const quickLinks = [
  { label: 'Início',        href: '/#inicio'        },
  { label: 'Sobre nós',     href: '/#sobre-nos'     },
  { label: 'EcoInventário', href: '/#ecoinventario' },
  { label: 'Projetos',      href: '/#projetos'      },
  { label: 'Impacto',       href: '/#impacto'       },
  { label: 'Contato',       href: '/#contato'       },
]
const legalLinks = [
  { label: 'Política de Privacidade', href: 'mailto:comunidadedeplantae@gmail.com?subject=Privacidade' },
  { label: 'Termos de Uso',           href: 'mailto:comunidadedeplantae@gmail.com?subject=Termos'      },
]
const currentYear   = new Date().getFullYear()

const socials = [
  {
    label: 'Instagram',
    href: '#',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: 'Facebook',
    href: '#',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
      </svg>
    ),
  },
  {
    label: 'YouTube',
    href: '#',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
        <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
]

export default function Footer() {
  return (
    <footer id="contato" className="relative bg-dark border-t border-white/[0.06] overflow-hidden">

      {/* ── Floral canto inferior direito — Lateral_inferior_Direito.png ──
          Fundo transparente: flores de ipê emergem naturalmente do rodapé */}
      <div className="absolute right-0 bottom-0 pointer-events-none select-none z-0
                      w-44 sm:w-52 md:w-60 lg:w-72 xl:w-80">
        <Image
          src="/images/lateral-inf-direito.png"
          alt=""
          width={600}
          height={600}
          className="w-full h-auto object-contain object-bottom-right"
          sizes="(max-width: 640px) 176px, (max-width: 1024px) 240px, 320px"
          aria-hidden="true"
        />
      </div>

      {/* ── Main footer ── */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 py-16 lg:py-20">
        <div className="grid lg:grid-cols-4 gap-12 lg:gap-8">

          {/* Brand */}
          <div className="lg:col-span-2">
            {/* Logo image — mesma do header, fundo transparente */}
            <div className="relative h-12 w-44 mb-6">
              <Image
                src="/images/logo-header.png"
                alt="Comunidade Plantaê"
                fill
                className="object-contain object-left"
                sizes="176px"
              />
            </div>

            <p className="text-sand/45 text-sm leading-[1.8] max-w-[42ch] mb-8">
              Cultivando conhecimento e colhendo transformação. Uma comunidade dedicada
              à conservação da biodiversidade e ao desenvolvimento sustentável.
            </p>

            <div className="flex items-center gap-4">
              {socials.map(({ label, href, icon }) => (
                <a key={label} href={href} aria-label={label}
                  className="text-sand/40 hover:text-gold transition-colors duration-300">
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* Navegação */}
          <div>
            <h4 className="font-serif text-sm text-cream font-normal mb-6">Navegação</h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <a href={link.href}
                    className="text-sm text-sand/50 hover:text-cream transition-colors duration-300">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h4 className="font-serif text-sm text-cream font-normal mb-6">Contato</h4>
            <div className="space-y-3 mb-8">
              <a href="mailto:comunidadedeplantae@gmail.com"
                className="block text-sm text-sand/50 hover:text-cream transition-colors duration-300 break-all">
                comunidadedeplantae@gmail.com
              </a>
              <a href="tel:+5514998020946"
                className="block text-sm text-sand/50 hover:text-cream transition-colors duration-300">
                (14) 99802-0946
              </a>
            </div>

            <h4 className="font-serif text-sm text-cream font-normal mb-4">Newsletter</h4>
            <a href="#newsletter"
              className="inline-flex items-center gap-2 text-xs text-gold/70 hover:text-gold transition-colors duration-300 group">
              Inscrever-se
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
                className="group-hover:translate-x-1 transition-transform duration-300">
                <path d="M3 8H13M13 8L9 4M13 8L9 12"
                  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>

        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="relative z-10 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sand/35 text-xs">
            © {currentYear} Comunidade Plantaê. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-6">
            {legalLinks.map((link) => (
              <a key={link.label} href={link.href}
                className="text-xs text-sand/35 hover:text-sand/70 transition-colors duration-300">
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>

    </footer>
  )
}

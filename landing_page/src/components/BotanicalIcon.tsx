interface BotanicalIconProps {
  type: 'restoration' | 'education' | 'sustainable'
  className?: string
}

export default function BotanicalIcon({ type, className = '' }: BotanicalIconProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Diamond frame */}
      <path
        d="M32 6L58 32L32 58L6 32Z"
        stroke="#F5B93F"
        strokeWidth="0.8"
        fill="none"
        className="svg-draw"
        pathLength="200"
      />

      {type === 'restoration' && <RestorationIcon />}
      {type === 'education'   && <EducationIcon />}
      {type === 'sustainable' && <SustainableIcon />}
    </svg>
  )
}

function RestorationIcon() {
  return (
    <>
      {/* Trunk */}
      <line x1="32" y1="42" x2="32" y2="30" stroke="#F5B93F" strokeWidth="1.5" strokeLinecap="round" className="svg-draw" pathLength="200" />
      {/* Canopy circles */}
      <circle cx="32" cy="24" r="5.5" stroke="#F5B93F" strokeWidth="1.2" className="svg-draw" pathLength="200" />
      <circle cx="25" cy="27" r="4" stroke="#F5B93F" strokeWidth="1" className="svg-draw" pathLength="200" />
      <circle cx="39" cy="27" r="4" stroke="#F5B93F" strokeWidth="1" className="svg-draw" pathLength="200" />
      {/* Roots */}
      <path d="M32 42 Q27 46 23 49" stroke="#F5B93F" strokeWidth="1.2" strokeLinecap="round" fill="none" className="svg-draw" pathLength="200" />
      <path d="M32 42 L32 50" stroke="#F5B93F" strokeWidth="1.2" strokeLinecap="round" fill="none" className="svg-draw" pathLength="200" />
      <path d="M32 42 Q37 46 41 49" stroke="#F5B93F" strokeWidth="1.2" strokeLinecap="round" fill="none" className="svg-draw" pathLength="200" />
    </>
  )
}

function EducationIcon() {
  return (
    <>
      {/* Leaf shape */}
      <path
        d="M32 18 Q44 28 38 40 Q32 46 26 40 Q20 28 32 18Z"
        stroke="#F5B93F" strokeWidth="1.2" fill="none" className="svg-draw" pathLength="200"
      />
      {/* Central vein */}
      <line x1="32" y1="18" x2="32" y2="46" stroke="#F5B93F" strokeWidth="1" strokeLinecap="round" className="svg-draw" pathLength="200" />
      {/* Side veins */}
      <path d="M32 26 Q37 30 40 30" stroke="#F5B93F" strokeWidth="0.8" strokeLinecap="round" className="svg-draw" pathLength="200" />
      <path d="M32 32 Q37 35 39 36" stroke="#F5B93F" strokeWidth="0.8" strokeLinecap="round" className="svg-draw" pathLength="200" />
      <path d="M32 26 Q27 30 24 30" stroke="#F5B93F" strokeWidth="0.8" strokeLinecap="round" className="svg-draw" pathLength="200" />
      {/* Sun rays */}
      <line x1="32" y1="14" x2="32" y2="10" stroke="#F5B93F" strokeWidth="1" strokeLinecap="round" className="svg-draw" pathLength="200" />
      <line x1="39" y1="16" x2="42" y2="13" stroke="#F5B93F" strokeWidth="1" strokeLinecap="round" className="svg-draw" pathLength="200" />
      <line x1="25" y1="16" x2="22" y2="13" stroke="#F5B93F" strokeWidth="1" strokeLinecap="round" className="svg-draw" pathLength="200" />
    </>
  )
}

function SustainableIcon() {
  return (
    <>
      {/* Circular arrows */}
      <path
        d="M20 32 A12 12 0 0 1 44 32"
        stroke="#F5B93F" strokeWidth="1.2" strokeLinecap="round" fill="none" className="svg-draw" pathLength="200"
      />
      <path
        d="M44 32 A12 12 0 0 1 20 32"
        stroke="#F5B93F" strokeWidth="1.2" strokeLinecap="round" fill="none" className="svg-draw" pathLength="200"
      />
      {/* Arrow heads */}
      <path d="M18 28 L20 32 L24 30" stroke="#F5B93F" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" className="svg-draw" pathLength="200" />
      <path d="M40 34 L44 32 L46 36" stroke="#F5B93F" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" className="svg-draw" pathLength="200" />
      {/* Seedling */}
      <line x1="32" y1="37" x2="32" y2="46" stroke="#F5B93F" strokeWidth="1.5" strokeLinecap="round" className="svg-draw" pathLength="200" />
      <path d="M32 42 Q36 37 41 39" stroke="#F5B93F" strokeWidth="1" strokeLinecap="round" fill="none" className="svg-draw" pathLength="200" />
      <path d="M32 40 Q28 35 23 37" stroke="#F5B93F" strokeWidth="1" strokeLinecap="round" fill="none" className="svg-draw" pathLength="200" />
    </>
  )
}

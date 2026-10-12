export default function OrbitArt({ small = false }: { small?: boolean }) {
  return <svg className={`orbit-art ${small ? 'orbit-art-small' : ''}`} viewBox="0 0 620 430" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="planet" x1="296" y1="94" x2="439" y2="290" gradientUnits="userSpaceOnUse"><stop stopColor="#e4ffb5"/><stop offset=".34" stopColor="#bdeb72"/><stop offset="1" stopColor="#365b29"/></linearGradient>
      <linearGradient id="track" x1="45" y1="254" x2="564" y2="327" gradientUnits="userSpaceOnUse"><stop stopColor="#335940" stopOpacity="0"/><stop offset=".4" stopColor="#8eac6c"/><stop offset="1" stopColor="#2d4a35" stopOpacity="0"/></linearGradient>
      <linearGradient id="ring" x1="146" y1="221" x2="514" y2="124" gradientUnits="userSpaceOnUse"><stop stopColor="#7aeacf"/><stop offset=".52" stopColor="#c2fff0"/><stop offset="1" stopColor="#2b7b72"/></linearGradient>
      <radialGradient id="halo"><stop stopColor="#adf06e" stopOpacity=".25"/><stop offset="1" stopColor="#adf06e" stopOpacity="0"/></radialGradient>
      <filter id="soft"><feGaussianBlur stdDeviation="15"/></filter>
      <filter id="glow"><feGaussianBlur stdDeviation="3"/></filter>
    </defs>
    <ellipse cx="350" cy="209" rx="246" ry="185" fill="url(#halo)"/>
    <g opacity=".5" stroke="url(#track)">
      <path d="M69 358L319 156L585 362M124 383L319 156L535 384M181 399L319 156L474 400M245 406L319 156L409 409"/>
      <path d="M90 345Q321 267 562 345M128 310Q321 251 521 310M171 276Q321 237 477 276M210 244Q321 218 436 244"/>
    </g>
    <ellipse cx="352" cy="329" rx="118" ry="24" fill="#7baa47" opacity=".17" filter="url(#soft)"/>
    <ellipse cx="352" cy="329" rx="90" ry="10" fill="#94ce55" opacity=".15"/>
    <path d="M171 242C139 215 210 170 332 141S519 127 517 157" stroke="#36736d" strokeWidth="13"/>
    <circle cx="351" cy="199" r="94" fill="url(#planet)"/>
    <path d="M279 164C291 137 325 116 358 111M266 194C269 159 296 128 321 119" stroke="#f1ffd9" strokeOpacity=".3" strokeWidth="2"/>
    <path d="M296 267Q333 281 373 262" stroke="#325825" strokeOpacity=".35" strokeWidth="3"/>
    <path d="M171 242C206 274 306 248 413 210S519 178 517 157" stroke="url(#ring)" strokeWidth="14"/>
    <path d="M171 242C206 274 306 248 413 210S519 178 517 157" stroke="#a4ffdf" strokeWidth="2"/>
    <g transform="translate(156 184) rotate(-21)"><ellipse rx="17" ry="23" stroke="#e4a85b" strokeWidth="7"/><ellipse rx="17" ry="23" stroke="#ffcb84" strokeWidth="2"/></g>
    <g transform="translate(472 275) rotate(19)"><ellipse rx="20" ry="29" stroke="#bea4f8" strokeWidth="8"/><ellipse rx="20" ry="29" stroke="#e0d2ff" strokeWidth="2"/></g>
    <g transform="translate(493 75)"><path d="M0 -11V11M-11 0H11" stroke="#d4edb9" strokeWidth="2"/><circle r="4" fill="#d4edb9" opacity=".4" filter="url(#glow)"/></g>
    <g transform="translate(194 101)"><path d="M0 -5V5M-5 0H5" stroke="#8ca17c" strokeWidth="1.5"/></g>
    <circle cx="560" cy="214" r="3" fill="#90ba80"/><circle cx="119" cy="283" r="2" fill="#8eca8c"/><circle cx="427" cy="61" r="2" fill="#d1e9b6"/><circle cx="241" cy="320" r="2" fill="#e4b170"/>
    <g transform="translate(310 340)"><path d="M0 13L35 -7L70 13L35 30Z" fill="#252f3b" stroke="#849caa"/><path d="M0 13L35 20L70 13L35 -7Z" fill="#acbbc6"/><path d="M21 8L35 0L49 8L35 16Z" fill="#c7f56b"/><path d="M26 26L35 41L44 26" fill="#c7f56b" opacity=".7"/><path d="M30 33L35 55L40 33" fill="#c7f56b" opacity=".25" filter="url(#glow)"/></g>
    <path d="M304 373Q277 397 234 393" stroke="#b5ef72" strokeWidth="2" strokeDasharray="3 7" opacity=".5"/>
  </svg>;
}

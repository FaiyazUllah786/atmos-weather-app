export function Icon({ name, size = 20 }) {
  const paths = {
    air: (
      <>
        <path d="M4 9h10a3 3 0 1 0-3-3" />
        <path d="M4 13h14a2 2 0 1 1-2 2" />
        <path d="M4 17h7" />
      </>
    ),
    arrow: (
      <>
        <path d="m5 12 14 0" />
        <path d="m13 6 6 6-6 6" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    cloud: (
      <path d="M17.5 19H7a5 5 0 1 1 1.5-9.8A7 7 0 0 1 22 12a5 5 0 0 1-4.5 7Z" />
    ),
    compass: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m15 9-2 5-5 2 2-5 5-2Z" />
      </>
    ),
    droplet: (
      <path d="M12 22a7 7 0 0 0 7-7c0-4-7-13-7-13S5 11 5 15a7 7 0 0 0 7 7Z" />
    ),
    eye: (
      <>
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
        <circle cx="12" cy="12" r="2.5" />
      </>
    ),
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h14V10M9 20v-6h6v6" />
      </>
    ),
    location: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    map: (
      <>
        <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" />
        <path d="M9 3v15m6-12v15" />
      </>
    ),
    menu: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </>
    ),
    moon: <path d="M21 12.7A9 9 0 1 1 11.3 3 7 7 0 0 0 21 12.7Z" />,
    pause: (
      <>
        <path d="M9 5v14M15 5v14" />
      </>
    ),
    play: <path d="m8 5 11 7-11 7V5Z" />,
    rain: (
      <>
        <path d="M16 13a4 4 0 1 0-1-7.9A6 6 0 0 0 3 7a4 4 0 0 0 1 7h12Z" />
        <path d="m8 17-1 3m5-3-1 3m5-3-1 3" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a2 2 0 0 0 .4 2.2l.1.1-2.6 2.6-.1-.1a2 2 0 0 0-2.2-.4 2 2 0 0 0-1.2 1.8V21h-3.6v-.2A2 2 0 0 0 9 19a2 2 0 0 0-2.2.4l-.1.1-2.6-2.6.1-.1a2 2 0 0 0 .4-2.2A2 2 0 0 0 2.8 13H2V9h.8A2 2 0 0 0 4.6 7.8a2 2 0 0 0-.4-2.2l-.1-.1 2.6-2.6.1.1A2 2 0 0 0 9 3.4 2 2 0 0 0 10.2 2h3.6A2 2 0 0 0 15 3.4a2 2 0 0 0 2.2-.4l.1-.1 2.6 2.6-.1.1a2 2 0 0 0-.4 2.2A2 2 0 0 0 21.2 9h.8v4h-.8a2 2 0 0 0-1.8 2Z" />
      </>
    ),
    snow: (
      <>
        <path d="M12 2v20M4 7l16 10M20 7 4 17" />
        <path d="m9 4 3 2 3-2M9 20l3-2 3 2" />
      </>
    ),
    storm: (
      <>
        <path d="M17 13H7a5 5 0 1 1 1-9.9A7 7 0 0 1 21 7a5 5 0 0 1-4 6Z" />
        <path d="m13 13-4 6h4l-2 4 6-8h-4l2-2" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
    thermometer: (
      <>
        <path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z" />
        <path d="M12 9v8" />
      </>
    ),
    wind: (
      <>
        <path d="M3 8h12a3 3 0 1 0-3-3" />
        <path d="M3 12h16a2 2 0 1 1-2 2" />
        <path d="M3 16h9" />
      </>
    ),
    x: <path d="m6 6 12 12M18 6 6 18" />,
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.cloud}
    </svg>
  )
}

export function Button({
  children,
  className = "",
  onClick,
  label,
  disabled = false,
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
    >
      {children}
    </button>
  )
}

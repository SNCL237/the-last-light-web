const P: Record<string, string> = {
  structure: 'M3 7l9-4 9 4-9 4-9-4zm0 5l9 4 9-4M3 17l9 4 9-4',
  power: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
  comms: 'M4 18a10 10 0 0116 0M7 15a6 6 0 0110 0M12 12v9',
  control: 'M12 3v4m0 10v4M3 12h4m10 0h4M12 8a4 4 0 100 8 4 4 0 000-8z',
  payload: 'M9 3h6m-5 0v6l-5 9a2 2 0 002 3h10a2 2 0 002-3l-5-9V3',
  propulsion: 'M12 2c3 3 4 7 4 11l-4 3-4-3c0-4 1-8 4-11zM9 18l-2 4m8-4l2 4',
  clock: 'M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z', log: 'M5 4h14v16H5zM8 8h8M8 12h8M8 16h5',
  target: 'M12 3a9 9 0 100 18 9 9 0 000-18zm0 5a4 4 0 100 8 4 4 0 000-8z', help: 'M9 9a3 3 0 115 2c-1 1-2 1.5-2 3m0 3h.01M12 3a9 9 0 100 18 9 9 0 000-18z',
  pause: 'M9 5v14M15 5v14', check: 'M5 12l5 5 9-10', alert: 'M12 3l10 18H2L12 3zm0 7v5m0 3h.01', x: 'M6 6l12 12M18 6L6 18',
  battery: 'M3 8h15v8H3zM21 11v2M6 11h6', storage: 'M4 6c0-2 16-2 16 0v12c0 2-16 2-16 0zM4 6c0 2 16 2 16 0M4 12c0 2 16 2 16 0',
  money: 'M12 3v18M16 7c-1-1-2.5-1.5-4-1.5S8 6.5 8 8.5s2 2.5 4 3 4 1 4 3-2 3-4 3-3-.5-4-1.5', mass: 'M6 20h12l-2-11H8L6 20zM9 9a3 3 0 116 0',
  rocket: 'M12 2c4 3 5 8 4 13H8C7 10 8 5 12 2zM8 15l-3 4h4m7-4l3 4h-4m-3 0v3', save: 'M5 3h11l3 3v15H5zM8 3v6h8M8 21v-7h8v7',
  layers: 'M12 3l9 5-9 5-9-5 9-5zm-9 9l9 5 9-5',
  orbit: 'M12 9a3 3 0 100 6 3 3 0 000-6zM3 12c0-3 4-5 9-5s9 2 9 5-4 5-9 5-9-2-9-5z', play: 'M7 4l13 8-13 8V4z', ff: 'M3 5l9 7-9 7V5zm9 0l9 7-9 7V5z',
};
export type IconName = keyof typeof P;
export function Icon({ name, size = 16, label }: { name: string; size?: number; label?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"
    role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}><path d={P[name] ?? P.target} /></svg>;
}

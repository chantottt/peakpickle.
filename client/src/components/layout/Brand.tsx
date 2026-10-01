import { Link } from 'react-router-dom';
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <Link className={`brand ${light ? 'brand-light' : ''}`} to="/" aria-label="PeakPickle home">
      <img src="/peakpickle-logo.png" alt="" />
      <span>
        Peak<span>Pickle</span>
      </span>
    </Link>
  );
}

import { Link } from 'react-router-dom'
import { Container } from '@/components/Container'
import { Phone, Mail, MapPin, ArrowUpRight } from 'lucide-react'

const LOGO = 'https://abcsafetysolutions.com/wp-content/uploads/2021/10/logo-light.png'

export function SiteFooter() {
  return (
    <footer className="relative mt-auto overflow-hidden border-t border-slate-200/90 bg-white text-slate-600">
      <div
        className="pointer-events-none absolute inset-0 opacity-100"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 50% at 50% -30%, rgba(245,158,11,0.08), transparent), radial-gradient(ellipse 60% 40% at 100% 100%, rgba(56,189,248,0.1), transparent)',
        }}
      />
      <Container className="relative py-16">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <img src={LOGO} alt="" className="h-10 w-auto object-contain object-left brightness-0 opacity-90" />
            <p className="mt-6 max-w-md font-display text-lg font-medium leading-snug text-brand-900">
              Compliance training that meets workers where they are — desk, field, or phone.
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600">
              Houston-based ABC Safety Solutions. Self-paced online modules complement our classroom and onsite programs.
            </p>
            <a
              href="https://abcsafetysolutions.com/"
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 transition hover:text-sky-800"
            >
              Main website
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-2">
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Learn</p>
              <ul className="mt-5 space-y-3 text-sm">
                <li>
                  <Link to="/courses" className="transition hover:text-sky-800">
                    Course catalog
                  </Link>
                </li>
                <li>
                  <Link to="/my-courses" className="transition hover:text-sky-800">
                    My learning
                  </Link>
                </li>
                <li>
                  <Link to="/certificates" className="transition hover:text-sky-800">
                    Certificates
                  </Link>
                </li>
                <li>
                  <Link to="/verify-certificate" className="transition hover:text-sky-800">
                    Verify certificate
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Contact</p>
              <ul className="mt-5 space-y-4 text-sm">
                <li className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                  <span>
                    2313 W. Sam Houston Pkwy N, Ste 141
                    <br />
                    Houston, TX 77043
                  </span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Phone className="h-4 w-4 shrink-0 text-sky-600" />
                  <a href="tel:8329395289" className="transition hover:text-sky-800">
                    (832) 939-5289
                  </a>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="h-4 w-4 shrink-0 text-sky-600" />
                  <a href="mailto:info@abcsafetysolutions.com" className="transition hover:text-sky-800">
                    info@abcsafetysolutions.com
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="lg:col-span-3">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Hours</p>
            <p className="mt-5 text-sm leading-relaxed text-slate-600">Monday – Friday · 8:00 a.m. – 5:00 p.m. CDT</p>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">Nationwide and onsite training available.</p>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-slate-200/90 pt-8 text-xs text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} ABC Safety Solutions, Inc.</p>
          <p className="text-slate-500">Online portal · Prototype UI</p>
        </div>
      </Container>
    </footer>
  )
}

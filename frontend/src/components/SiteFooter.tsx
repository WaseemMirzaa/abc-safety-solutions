import { Link } from 'react-router-dom'
import { Container } from '@/components/Container'
import { Phone, Mail, MapPin, ArrowUpRight } from 'lucide-react'
import { t } from '@/i18n/t'

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
              {t('ui_site_footer_tagline')}
            </p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600">
              {t('ui_site_footer_blurb')}
            </p>
            <a
              href="https://abcsafetysolutions.com/"
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-sky-700 transition hover:text-sky-800"
            >
              {t('ui_site_footer_main_website')}
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          <div className="grid gap-10 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-2">
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t('SiteFooter_40_learn_d41d903e88')}</p>
              <ul className="mt-5 space-y-3 text-sm">
                <li>
                  <Link to="/courses" className="transition hover:text-sky-800">
                    {t('ui_footer_course_catalog')}
                  </Link>
                </li>
                <li>
                  <Link to="/my-courses" className="transition hover:text-sky-800">
                    {t('ui_nav_my_learning')}
                  </Link>
                </li>
                <li>
                  <Link to="/certificates" className="transition hover:text-sky-800">
                    {t('ui_nav_certificates')}
                  </Link>
                </li>
                <li>
                  <Link to="/verify-certificate" className="transition hover:text-sky-800">
                    {t('ui_nav_verify_certificate')}
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t('SiteFooter_65_contact_bf5dd7b5e5')}</p>
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
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t('SiteFooter_92_hours_59cfe80abb')}</p>
            <p className="mt-5 text-sm leading-relaxed text-slate-600">{t('SiteFooter_93_monday_friday_8_00_a_m_5_00_p_m_cdt_6f7d40b13f')}</p>
            <p className="mt-3 text-xs leading-relaxed text-slate-500">{t('SiteFooter_94_nationwide_and_onsite_training_available_7f7589e9c9')}</p>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-slate-200/90 pt-8 text-xs text-slate-500 sm:flex-row">
          <p>{t('ui_footer_copyright', { year: new Date().getFullYear() })}</p>
          <p className="text-slate-500">{t('SiteFooter_100_online_portal_prototype_ui_60ee7c699a')}</p>
        </div>
      </Container>
    </footer>
  )
}

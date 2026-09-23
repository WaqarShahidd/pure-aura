import { Link } from 'react-router-dom'
import NewsletterBar from '../../components/Common/NewsletterBar/NewsletterBar'
import PaymentIcons from '../../components/Common/PaymentIcons/PaymentIcons'
import { SOCIAL_ICONS } from '../../config/socialIcons'
import { useBootstrap } from '../../data/useContent'

export default function Footer() {
  const { settings, socials, footer } = useBootstrap()
  const about = settings.footerAbout ?? { heading: settings.name, body: '' }

  return (
    <footer>
      <NewsletterBar />

      <div className="bg-charcoal text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-6 py-16 md:grid-cols-4 md:px-10">
          <div className="col-span-2 md:col-span-1">
            <h3 className="mb-3 font-semibold">{about.heading}</h3>
            <p className="max-w-xs text-sm text-white/70">{about.body}</p>
          </div>

          {footer.map((group) => (
            <div key={group.title}>
              <h3 className="mb-3 font-semibold">{group.title}</h3>
              <ul className="flex flex-col gap-2 text-sm text-white/70">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h3 className="mb-3 font-semibold">Find us on</h3>
            <ul className="flex flex-col gap-3 text-sm text-white/70">
              {socials.map(({ label, icon, href }) => {
                const Icon = SOCIAL_ICONS[icon]
                // The API filters unknown icon keys, but a stale cache could still
                // carry one, and rendering `undefined` as a component blanks the page.
                if (!Icon) return null
                return (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 hover:text-white"
                    >
                      <Icon fontSize="small" />
                      {label}
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col-reverse items-center justify-between gap-4 px-6 py-6 text-xs text-white/60 md:flex-row md:px-10">
            <p>
              &copy; {new Date().getFullYear()}, {settings.name}. Powered by Shopify
            </p>

            <PaymentIcons icons={settings.footerPaymentIcons} />
          </div>
        </div>
      </div>
    </footer>
  )
}

import { Link } from 'react-router-dom'
import NewsletterBar from '../../components/Common/NewsletterBar/NewsletterBar'
import PaymentIcons from '../../components/Common/PaymentIcons/PaymentIcons'
import LocaleSelect from '../Header/LocaleSelect'
import { footerLinkGroups, footerAbout } from '../../config/footerLinks'
import { site } from '../../config/site'
import { SOCIAL_ICONS } from '../../config/socialIcons'

export default function Footer() {
  return (
    <footer>
      <NewsletterBar />

      <div className="bg-charcoal text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-6 py-16 md:grid-cols-4 md:px-10">
          <div className="col-span-2 md:col-span-1">
            <h3 className="mb-3 font-semibold">{footerAbout.heading}</h3>
            <p className="max-w-xs text-sm text-white/70">{footerAbout.body}</p>
          </div>

          {footerLinkGroups.map((group) => (
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
              {site.socials.map(({ label, icon, href }) => {
                const Icon = SOCIAL_ICONS[icon]
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
            <div className="flex items-center gap-4">
              <LocaleSelect label="Language" options={site.languages} tone="dark" />
              <LocaleSelect label="Region" options={site.regions} tone="dark" />
            </div>

            <p>
              &copy; {site.copyrightYear}, {site.name}. Powered by Shopify
            </p>

            <PaymentIcons />
          </div>
        </div>
      </div>
    </footer>
  )
}

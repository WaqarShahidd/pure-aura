import PageHero from '../PageHero/PageHero'

export default function StaticPage({ page, crumbs }) {
  return (
    <>
      <PageHero title={page.title} accent={page.accent} intro={page.intro} crumbs={crumbs} />

      <article className="mx-auto max-w-3xl px-6 py-16 md:px-10">
        {page.updated && (
          <p className="mb-10 text-xs uppercase tracking-wide text-text-muted">
            Last updated {page.updated}
          </p>
        )}

        <div className="flex flex-col gap-10">
          {page.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-3 text-lg font-medium">{section.heading}</h2>
              <div className="flex flex-col gap-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="text-sm leading-relaxed text-text-muted">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </article>
    </>
  )
}

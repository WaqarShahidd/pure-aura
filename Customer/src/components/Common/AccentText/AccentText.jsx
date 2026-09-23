import { Accent } from '../SectionHeading/SectionHeading'

// Renders a heading whose emphasised fragment comes from data rather than from JSX.
//
// Headings used to be written as literal JSX - <>Your skin. <Accent>Glowing.</Accent></> -
// which no admin text field can produce. They are now { text, accent } where `accent` is a
// substring of `text`, and this finds it.
//
// PageHero already worked this way (title.endsWith(accent), falling back to the plain
// title when it does not match); this generalises that from endsWith to indexOf so the
// emphasis can sit anywhere in the line. The fallback behaviour is the important part: a
// typo in `accent` produces a plain heading, never broken markup, and nothing here ever
// needs dangerouslySetInnerHTML.
export default function AccentText({ text, accent }) {
  if (!text) return null

  const at = accent ? text.indexOf(accent) : -1
  if (at === -1) return text

  return (
    <>
      {text.slice(0, at)}
      <Accent>{accent}</Accent>
      {text.slice(at + accent.length)}
    </>
  )
}

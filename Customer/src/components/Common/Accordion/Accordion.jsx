import { useState } from 'react'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import { cn } from '../../../utils/classNames'

// Hand-rolled rather than MUI Accordion, which is Paper-based and would inherit the theme's
// global borderRadius of 999 along with dividers and shadows that fight the design.
//
// sections: [{ id, title, content }] — `content` is a node.
export default function Accordion({ sections, defaultOpenId, className }) {
  const [openId, setOpenId] = useState(defaultOpenId ?? null)

  return (
    <div className={cn('divide-y divide-charcoal/10 border-y border-charcoal/10', className)}>
      {sections.map((section) => {
        const isOpen = section.id === openId
        return (
          <div key={section.id}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenId(isOpen ? null : section.id)}
              className="flex w-full items-center justify-between py-4 text-left text-sm font-medium"
            >
              {section.title}
              <KeyboardArrowDownIcon
                fontSize="small"
                className={cn('shrink-0 transition-transform', isOpen && 'rotate-180')}
              />
            </button>

            {isOpen && <div className="pb-5">{section.content}</div>}
          </div>
        )
      })}
    </div>
  )
}

import { createContext } from 'react'

// Split across three files because eslint-plugin-react-refresh's only-export-components
// rule forbids a module that exports both a component and a non-component. The storefront
// splits its cart context the same way for the same reason.
export const AuthContext = createContext(null)

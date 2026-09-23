import { createContext } from 'react'

// Split across three files for the same reason the cart is: eslint-plugin-react-refresh's
// only-export-components rule forbids a module that exports both a component and a
// non-component.
export const AuthContext = createContext(null)

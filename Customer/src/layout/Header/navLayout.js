// Which dropdown shape a nav item uses. Lives apart from NavItem.jsx because a file that
// exports both a component and a helper breaks fast refresh.
export function layoutOf(item) {
  if (item.layout) return item.layout
  return item.children?.length ? 'list' : 'link'
}

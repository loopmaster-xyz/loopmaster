export function setFaviconSvg(svgText: string): void {
  const href = 'data:image/svg+xml;charset=utf-8,'
    + encodeURIComponent(svgText)
    + '#'
    + Date.now() // cache-buster (Safari)

  let link = document.querySelector<HTMLLinkElement>('link[rel=\'icon\']')

  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }

  link.type = 'image/svg+xml'
  link.href = href
}

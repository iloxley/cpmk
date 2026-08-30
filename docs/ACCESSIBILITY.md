# Dashboard accessibility

The local app is three HTML pages (Memory, Guide, Demo) with:

- a language attribute and document title
- a labeled navigation landmark and `aria-current` on the active page
- one `h1` per page and labeled form fields on Memory
- a table caption for the entry list
- buttons that do not rely on color alone (`Filter`, `Remember`, `Archive`)
- `textContent` rendering so memory text is not interpreted as HTML
- escaped markdown on Guide and Demo so authored docs cannot inject scripts

Known limits: there is no live-region announcement after remember/archive. Contrast is now set in the page stylesheet; a future 1.x UI pass should add a status live region and explicit focus management after mutations. Keyboard users can tab through nav, fields, and buttons.

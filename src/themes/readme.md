# plenty-themes

```sh
npm i plenty-themes
```

Then:

```js
// in vite and others:
import 'plenty-themes/google-dark.css'

// json
import json from 'plenty-themes/google-dark.json'

// all in one css
import 'plenty-themes/_all.css'

// array of name ids
import names from 'plenty-themes/_names.json'
```

And wherever you wish to use the CSS variables, e.g. `<body>`:

```html
<body theme="andromeda"></body>
```

```css
body {
  background: var(--background);
}
a {
  color: var(--blue);
}
strong {
  color: var(--yellow);
}
h1 {
  color: var(--foreground);
}
```


## Credits

- To all the creators of all these themes. Various sources were used to generate these. If you're the creator of one of the themes and want your name credited or maybe don't want it included in this collection, please open an issue or provide a PR.

## License

MIT

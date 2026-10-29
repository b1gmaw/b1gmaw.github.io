# b1gmaw.github.io

My portfolio, served at https://b1gmaw.github.io/. A single static page (HTML, SCSS, vanilla JS) with a Cyberpunk-inspired HUD theme, a black-on-yellow alternate mode and a "press any key" boot screen.

This repo is both the source and the deployed site: GitHub Pages serves `main`, so merging a PR publishes it.

## Live GitHub data

"Now building" and the status panel on the home page are rendered from `api.github.com/users/b1gmaw/repos` on every visit. Change them on GitHub, not in this code:

| To… | Do this on GitHub |
|---|---|
| Show a project | Make the repo public |
| Hide a project | Add the topic `portfolio-hide` |
| Make it the big card and the "current side-gig" | Add the topic `featured` (otherwise the most recently pushed repo is featured) |
| Change the card text | Edit the repo description |
| Add an "Open" button | Set the repo's website (homepage) |

Other topics show as `#tags` on the card. Forks, archived repos, the profile repo, `portfolio_page` and this repo are always skipped.

The cards written in `index.html` are the fallback when JavaScript is off or GitHub is unreachable. A `.demo` block, `.facts` list or `h3 small` subtitle there is also copied onto that repo's live card, which is how dejapanify keeps its conversion demo.

Responses are cached in `localStorage` for 10 minutes, then revalidated with an ETag, so a visitor normally uses one API request per 10 minutes (GitHub allows 60 per hour per IP).

## Editing styles

Edit `styles/styles.scss` and its partials (`_boot.scss`, `_media.scss`), then compile and commit the CSS too, since Pages serves `styles/styles.css` as-is:

```sh
npx sass --no-source-map --silence-deprecation=import styles/styles.scss styles/styles.css
```

## Run locally

```sh
python3 -m http.server 8000
```

Sections can be linked directly: `#about`, `#portfolio`, `#contact`. The boot screen shows once per browser session; open a private window to see it again.

# Playables portfolio

Static site. No build step. Push to `main` and GitHub Pages redeploys in 10–60 seconds.

**Live:** https://omnomnom08.github.io/playables/

```
index.html               everything — markup, CSS, JS. Card data is the
                         PLAYABLES array near the bottom.
play/<slug>.html         one self-contained playable per file
assets/posters/<slug>.webp   card art
assets/daria-*.webp      hero and contact portraits
scripts/debrand.mjs      strips store redirect links from a build
scripts/shoot-posters.mjs captures a poster from a published playable
```

## Add a playable

```bash
node scripts/debrand.mjs "D:/cation_dev/ADRAWER/<build>.zip" my-slug
```

Removes Google Play / App Store redirect links **only**, verifies none remain, writes
`play/my-slug.html` and prints a row to paste into the `PLAYABLES` array. Delivery bundles —
zips holding every ad-network variant — are handled: it picks the `xcl_en – preview` build.

Then capture a poster:

```bash
node scripts/shoot-posters.mjs my-slug     # writes shots/my-slug.png
# downscale to 480x854 webp q74 with sharp -> assets/posters/my-slug.webp
```

## Local preview

```bash
npx serve .
```

---

## Known issues

### Bowmasters has no audible sound
**Unresolved.** The build loads 27 sound files and then sets Howler's master mute at
startup. `index.html` has an `unmute()` helper that reaches into the iframe once the engine
exists and clears the mute — **this works** (verified live: `Howler._muted` goes `true` →
`false` and stays there) — **but the creative is still silent in practice.**

So clearing the mute flag is not sufficient. Whatever silences it happens elsewhere: the
audio may be gated on an ad-network SDK callback that never fires in the `preview` variant,
or routed through a context the flag does not govern.

Things not yet tried:
- a different network variant of the same build (`google`, `unity`, `applovin`,
  `ironsource_mraid`, `moloco`, `mintegral` are all in the source zip — only `preview` is
  published)
- a different Bowmasters export from `D:\cation_dev\ADRAWER`
- inspecting the creative's own speaker/mute control, if it has one

The `unmute()` helper is left in place: it is guarded, only acts when a build is actually
muted, and is correct behaviour for any future build that ships muted. It is not the cause
of the problem and removing it would not fix anything.

### Two Play Store links may be region-restricted
`Idle Pet Shop` and `Fantasy Tavern` in the About panel resolve for some viewers and not
others. Both listings are live; the apps are simply not distributed everywhere.

---

## Gotchas

- **The file is CRLF on disk.** Any scripted multi-line find-and-replace must
  `.replace(/\r\n/g,"\n")` first, or the match silently fails.
- **Never put `opacity:0` in CSS for reveal animations.** The hidden state is set from JS so
  that a script error degrades to visible content, with a 2.5 s failsafe.
- **Anything absolutely positioned inside `.frame` outranks a static iframe.** The iframe is
  `position:absolute; z-index:2` for exactly this reason — it was once rendering *behind* its
  own poster while playing audio.
- **Capture posters with the GPU on.** `--disable-gpu` falls back to software rasterisation,
  which silently drops custom shaders (blank ground planes).

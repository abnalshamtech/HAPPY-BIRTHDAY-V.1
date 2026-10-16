# HAPPY BIRTHDAY V.1 – prank page

An interactive birthday surprise website with a retro hacker-terminal theme.

It asks a couple of questions, pretends to hack the visitor's phone,
then reveals a Happy Birthday screen with a cake, chiptune music and falling code.

**Live demo:** https://abnalshamtech.github.io/HAPPY-BIRTHDAY-V.1/

> **Note:** this page does not collect, send or store any data.
> It's only a small, harmless joke to surprise your friends.

![Happy Birthday screen](images/05-birthday.png)

## How it works

**1. The question:** "Do You Trust Me?" After the first "NO", the button runs away from the mouse.

![Do you trust me screen](images/01-trust.png)

**2. Saying no:** a popup appears, and "NO" won't sit still after that.

![Rejected popup](images/02-popup.png)

**3. The threat:** "Can I Hack Your Phone?" "DISAGREE" also runs away after the first click.

![Can I hack your phone screen](images/03-hack.png)

**4. The fake hack:** a terminal log and progress bar. Nothing real happens.

![Fake hack log](images/04-fake-hack.png)

**5. The reveal:** Happy Birthday with ASCII art, a flickering cake, music and code rain.

![Happy Birthday reveal](images/05-birthday.png)

## On mobile

<p>
  <img src="images/06-mobile-trust.png" alt="Mobile – first screen" width="260">
  &nbsp;&nbsp;
  <img src="images/07-mobile-birthday.png" alt="Mobile – Happy Birthday screen" width="260">
</p>

## Change the texts, name or phone

Open `index.html` and scroll to the **CONFIG** block at the bottom
(marked **EDIT HERE**). You can change the questions, the messages,
the birthday wish and the phone number there.

## Files

| File         | What it is                                     |
|--------------|------------------------------------------------|
| `index.html` | The page, plus the CONFIG block                |
| `style.css`  | All the styling                                |
| `script.js`  | All the behaviour                              |
| `_headers`   | Security headers (Netlify / Cloudflare Pages)  |
| `images/`    | Screenshots used in this README                |

## Run it

No build step. Open `index.html` in a browser, or host the folder on
GitHub Pages, Netlify or Cloudflare Pages.

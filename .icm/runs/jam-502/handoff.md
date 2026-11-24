# Handoff jam-502

## Next action

Jamie reads `.icm/setup/search-console-bing.md` and the two changed boxes of
`.icm/docs/launch-runbook.md`. Then Jamie ticks Ready to merge. Jamie does part A of the
setup file before the go-live (JAM-471), and parts B and C in the hour of Track H.

## What changed and why no user sees it

- New setup file `.icm/setup/search-console-bing.md`: one box for each step. Part A adds the
  `google-site-verification` TXT record in Vercel DNS and verifies the Domain property in
  Search Console. Part B submits `https://agorasim.pt/sitemap.xml`. Part C imports the site
  into Bing Webmaster Tools.
- `.icm/docs/launch-runbook.md`: Track H has a Search Console box that points at the setup
  file, and a new Bing box. Track G step 3 says that part A comes before the snapshot
  `before.txt`. Then the diff of Track G still shows only the two rows.
- Only documents change. The site and the app do not change. No user sees a difference.

## How to test

Open `.icm/setup/search-console-bing.md` on the pull request. Each step has one box, and the
order with the go-live is clear. Track H of the launch runbook has a box for Bing.

## Blockers

- none

## Do not touch

- none

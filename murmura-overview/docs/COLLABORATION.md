# Working together on posts

Five features for a team (and its clients) working on the same posts. They
work in the demo and, shared live, on a Kataru server ([`ACCOUNTS.md`](ACCOUNTS.md)).

## Notes and versions

- **Notes** on a post (composer → *Notes*, and the post drawer): the team's
  conversation about it, never published. Type `@` to mention someone who sees
  the brand; they get a notification (clients land on Approvals, the team in
  the composer). Notes can be resolved and reopened; people delete only their own.
- **Versions**: every time a saved post's text, photos or networks change, the
  previous version is kept (the last 15), with who changed it and when.
  *Restore* puts one back in the editor; it is saved only when the post is.

## Ideas and the client's sign-off

- **Ideas** (Approvals → *Ideas*): anyone who sees a brand, clients included,
  suggests a post (title, brief, wanted-by date, link). The people who write
  posts for the brand are told. *Write the post* opens the composer with the
  brief, brand and date; saving it links the post and tells whoever had the idea.
  *Decline* takes a reason. The idea's card follows the post: being written,
  with the team, waiting for the client, scheduled, published.
- **Client sign-off** (Approvals → *Client sign-off*, per brand, needs
  **Workspace settings**): the brand's posts go to its client after the team,
  and go out only once the client approves. A manager or admin who sends a post
  skips the team step: it goes straight to the client. Editors' posts are
  approved by the team first, then move to the client. The client sees them in
  *Waiting for me* with a *Client review* badge; sending back returns them to
  the writer. The server refuses to schedule or publish such a post without the
  client's approval (`server/workspace/policy.ts`, `src/data/workflow.ts`).

## Read, per person, and who's here

- Conversations are unread for each person until *they* open them; notifications
  are read per person. (Older items marked read stay read for everyone.)
- On a server, the composer shows who else has the same post open ("Rui is
  editing this too") and the inbox who else is on the same conversation.

## The editorial calendar

- **Key dates** on the week and month grids and in *Coming up* (next 60 days):
  Portugal's public holidays (Easter, Carnival and Corpus Christi worked out each
  year), Lisbon's and Porto's, observances (Women's Day, Europe Day…), shopping
  moments (Valentine's, Mother's and Father's Day, Black Friday, Cyber Monday,
  11.11) and days for the brands' sectors (coffee, food, beauty, home), read from
  what each brand does. The calendar icon in the filter bar hides them.
- **Your dates**: add a date (once or every year, for a brand or all).
  *Plan a post* opens the composer on that day.
- **Campaigns and themes**: create one from *Coming up*; it shows as a ribbon.

## Repeating and evergreen posts

- **Repeat** (composer, new posts): every week, every 2 weeks or every month,
  2–26 times, with up to 6 variations of the text taking turns. Saving makes one
  post per time, linked as a series ("Part 2 of 6"); the drawer can stop the
  series after any of them.
- **Evergreen**: mark a published post evergreen from its drawer; *Post again*
  (drawer, or *Evergreen* on the calendar, longest-rested first) makes a new post
  from it with the original text or a variation, optionally keeping new text as
  a variation, through approval when needed.

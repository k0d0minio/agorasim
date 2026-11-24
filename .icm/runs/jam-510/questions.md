### Q1. What happens to the claims of the brief that are not in business-facts.md?
- type: single
- options: cut the claims from the brief | add them to business-facts.md after the client confirms them
- default: cut the claims from the brief. For this batch that is article 1: the saloios supplied Lisbon with vegetables, bread and wine. The region is half an hour from the coast and from the capital. Ramilo is on the Atlantic-facing slopes of Colares.
- answer: cut the claims from the brief
- note: Jamie answered in the chat of the queue session on 2026-11-24.

### Q2. Who loads the three drafts into the UAT database?
- type: single
- options: the agent runs blog:load once with the UAT connection string in the process environment only | Jamie runs blog:load
- default: the agent runs blog:load once, after CI is green and before Ready to merge. The connection string never goes into a file.
- answer: the agent runs blog:load once with the UAT connection string in the process environment only
- note: Jamie answered in the chat of the queue session on 2026-11-24.

### Q3. How does the run measure the token use of each article?
- type: single
- options: one subagent drafts one article, and the pull request states the tokens that the harness reports for it | an estimate from the length of the files
- default: one subagent drafts one article, and the pull request states the tokens that the harness reports for it
- answer: one subagent drafts one article, and the pull request states the tokens that the harness reports for it
- note: Jamie answered in the chat of the queue session on 2026-11-24.

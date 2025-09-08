## What’s in this PR?
- [ ] App loads on Lovable + GH Pages (HashRouter + `base: './'`)
- [ ] Supabase auth unchanged: `/auth/callback` path, no hashes, no service key
- [ ] Edge functions forward `Authorization` header
- [ ] RLS not weakened (policies include `auth.uid()` where required)
- [ ] Smoke run passed (`npm run ci:smoke`)

### Notes for reviewers
<!-- short context or risks -->

### Screenshots
<!-- optional -->

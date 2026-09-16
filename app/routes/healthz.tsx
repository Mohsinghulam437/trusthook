// Keep-alive / health endpoint.
//
// Render's free instances spin down after ~15 minutes with no traffic and
// then take the better part of a minute to wake up. That is a real problem
// for this app specifically: it is aimed at new, low-traffic stores, so the
// app would be asleep for most of the few shoppers who do turn up, and they
// would see no badges at all. An external uptime pinger hitting this route
// every few minutes keeps the instance warm.
//
// Deliberately does NOT touch the database. The hosted Postgres suspends
// itself when idle and only bills compute while awake, so a ping that ran a
// query every five minutes would hold the database open 24/7 and burn
// through the free compute allowance for no reason. This route answers the
// only question the pinger is actually asking: is the web process up?
//
// No default export, so this is a resource route — nothing is rendered and
// no React runs for it.
export const loader = () => {
  return new Response("ok", {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "no-store",
    },
  });
};

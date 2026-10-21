<script setup>
import MeterGauge from "../components/Meter/MeterGauge.vue";
import styles from "./HowItWorksPage.module.css";

// Deliberately high-level. The exact thresholds, weights and the sentiment lexicon live only on the server
// so the meter can't be gamed by reading this page.
const steps = [
  {
    n: "01",
    title: "We listen where people actually talk",
    body: "For every movie, show and game we pull public posts from Reddit and X that mention the title by name. Not reviews written for us — conversations people were already having."
  },
  {
    n: "02",
    title: "Every post gets read — in context",
    body: "Each post is read against the title it was found for: is it actually a reaction to this movie or show, and how does the author feel about it? A thread arguing with a bot that happens to name the show doesn’t count, and “the sequel sucks but this one was great” scores as praise. Posts land anywhere from strongly negative to strongly positive, and no single one moves the needle much."
  },
  {
    n: "03",
    title: "The crowd decides what carries weight",
    body: "A post that hundreds of people upvoted or replied to counts for more than one nobody saw — but on a curve, so one viral post can’t drown out everything else. Newer posts count a little more than old ones."
  },
  {
    n: "04",
    title: "One person, one voice",
    body: "Each account gets one counted post per title. Post about a film twenty times and the meter hears you once. Identical text showing up from different accounts counts once too, for whoever said it first."
  },
  {
    n: "05",
    title: "Accounts have to be real to be heard",
    body: "Brand-new accounts don’t count at all. Young accounts and accounts with no history on their platform count at reduced weight, ramping up as they age. We check account age and standing at the source every time we refresh."
  },
  {
    n: "06",
    title: "Then it all rolls up to one number — with a margin",
    body: "Everything above combines into a 0–100 reading where 50 means perfectly split. A handful of posts is pulled toward 50 until there’s enough evidence to say otherwise, and every reading comes with a 95% range. Confidence tells you how much of the number is posts rather than caution; the trend line says whether it is actually moving, tested, not eyeballed."
  }
];

// The aggregation, in full. Thresholds for trust stay private; the maths does not — a score nobody can check is a vibe.
const methods = [
  {
    name: "Weighted mean",
    what: "Each post’s sentiment (−1 to +1) is weighted by engagement (log-scaled), recency, trust and substance. The weighted average, mapped to 0–100, is the raw score."
  },
  {
    name: "Effective posts (Kish)",
    what: "Kish’s effective sample size, (Σw)² / Σw², says how many equal posts a weight profile is worth — one viral post among ten is worth about one. Multiplied by the average trust-and-substance credit, so forty throwaway posts are worth a few."
  },
  {
    name: "Bayesian average",
    what: "The same formula IMDb publishes for its Top 250: score = (n·mean + k·neutral) / (n + k), where n is effective posts and k is currently six. With six effective posts the data and the prior count equally; Electric needs several times that."
  },
  {
    name: "95% range",
    what: "A Student-t interval on the weighted mean, from the standard error of a weighted mean with reliability weights, scaled by the same factor as the score. Unanimous posts never claim zero uncertainty: the per-post spread has a floor, because reading a post has noise of its own."
  },
  {
    name: "Trend (Mann-Kendall)",
    what: "One reading is kept per day. The Mann-Kendall test — the standard non-parametric test for a monotonic trend in a short series — decides whether the line is rising or cooling at p < 0.05; Sen’s slope gives the rate. Fewer than five daily readings: no verdict."
  },
  {
    name: "Reading accuracy",
    what: "The model that reads posts is checked against a hand-labelled set of real posts every time its instructions change: was the post about the title, how did the author feel, how much substance. A change that lowers accuracy doesn’t ship."
  }
];

// Three real-shaped posts through the pipeline, numbers computed with the production code.
const example = {
  posts: [
    { who: "X · 10 likes · 2 days old", text: "The third act is the best thing Villeneuve has done — the worm ride alone.", read: "+0.80", substance: "Specific", trust: "full", weight: "1.83" },
    { who: "Reddit · 120 upvotes, 30 comments · 5 days old", text: "Really good. Long, though.", read: "+0.50", substance: "Some detail", trust: "full", weight: "2.62" },
    { who: "X · 0 likes · 1 day old · young account", text: "mid", read: "−0.30", substance: "Bare", trust: "reduced", weight: "0.33" }
  ],
  steps: [
    ["Weighted mean", "(1.83·0.80 + 2.62·0.50 − 0.33·0.30) / 4.77 = +0.56 → raw score 78"],
    ["Effective posts", "Kish: 4.77² / (1.83² + 2.62² + 0.33²) = 2.21 · average credit 0.61 = 1.35"],
    ["Bayesian average", "(1.35 · 0.56 + 6 · 0) / (1.35 + 6) = +0.10 → score 55 · confidence 18%"],
    ["95% range", "t(1.21 df) × standard error, scaled by 0.18 → ±9 → 46–64"]
  ],
  verdict: "Three glowing posts read as 55 ± 9, Warm, low confidence — not Electric. Thirty posts like the first two would."
};

const bands = [
  { label: "Cold", range: "0–34", color: "var(--meter-cold)", text: "The crowd is mostly down on it." },
  { label: "Lukewarm", range: "35–49", color: "var(--meter-lukewarm)", text: "Leaning negative or just mixed." },
  { label: "Warm", range: "50–64", color: "var(--meter-warm)", text: "More good than bad." },
  { label: "Hot", range: "65–79", color: "var(--meter-hot)", text: "People are into it." },
  { label: "Electric", range: "80–100", color: "var(--meter-electric)", text: "Near-universal love. Rare." }
];

const notes = [
  ["We only measure what’s current.", "Titles in theaters, on the air, coming soon, trending, this season’s picks (horror in October, love stories in February…), games topping Steam’s sellers and player charts, and anything that has gone electric. Everything else is browsable with critic ratings but locked — opinions on a ten-year-old film don’t change by the hour, and reading the whole internet for every title ever made isn’t worth anyone’s money."],
  ["For games, it’s the “right now” number.", "Steam’s percentage is an all-time verdict; for early-access and live-service games it can be years stale. SocialMeter reads the most recent Steam reviews — weighted by how long the reviewer actually played — together with X and Reddit, and shows it beside Steam’s all-time and 30-day scores. Launch was rough but the last patch landed? You’ll see it."],
  ["It is not a critic score.", "Critics are on the ratings strip next to it. The meter is the audience, unfiltered — then filtered for bots."],
  ["It moves.", "Opinions shift after opening weekend, after a finale, after a Reddit thread blows up. Readings refresh every few hours."],
  ["Low confidence means low confidence.", "A reading built on a handful of posts is pulled toward 50 and shown with a wide range. We say so right next to the number, and the “why this score” panel on every title shows the posts and the arithmetic."],
  ["Deleted there, deleted here.", "We re-check every stored post against Reddit and X daily. If you deleted it, or a moderator removed it, it leaves our database and the score is recomputed without it. Nothing is kept longer than a year."],
  ["We publish the maths, not the cut-offs.", "The aggregation is below in full, with a worked example. Exact cut-offs for account age, reputation and playtime aren’t published: if they were, the first thing anyone would do is build accounts that just clear them."]
];
</script>

<template>
  <div :class="styles.page">
    <div class="container">
      <header :class="styles.hero">
        <div :class="styles.heroText">
          <span :class="styles.eyebrow">How it works</span>
          <h1 :class="styles.title">One number for what the internet <em>actually</em> thinks.</h1>
          <p :class="styles.lede">
            Star ratings can be review-bombed in an afternoon. SocialMeter listens to real conversations instead,
            weighs them by how real the people behind them are, and refuses to let any one voice shout.
          </p>
        </div>
        <div :class="styles.heroGauge">
          <MeterGauge :score="72" :total-posts="1" label="Hot" size="lg" caption="example reading" />
        </div>
      </header>

      <ol :class="styles.steps">
        <li v-for="s in steps" :key="s.n" :class="styles.step">
          <span :class="styles.stepN">{{ s.n }}</span>
          <div>
            <h2 :class="styles.stepTitle">{{ s.title }}</h2>
            <p :class="styles.stepBody">{{ s.body }}</p>
          </div>
        </li>
      </ol>

      <section :class="styles.section">
        <h2 :class="styles.h2">Reading the meter</h2>
        <ul :class="styles.bands">
          <li v-for="b in bands" :key="b.label" :class="styles.band" :style="{ '--c': b.color }">
            <span :class="styles.bandLabel">{{ b.label }}</span>
            <span :class="styles.bandRange">{{ b.range }}</span>
            <span :class="styles.bandText">{{ b.text }}</span>
          </li>
        </ul>
      </section>

      <section id="method" :class="styles.section">
        <h2 :class="styles.h2">The method, in full</h2>
        <p :class="styles.sectionLede">
          Every reading on the site can be recomputed from its posts with the steps below. These are standard tools —
          the same ones survey statisticians and ratings sites use — not a recipe of our own.
        </p>
        <div :class="styles.methods">
          <div v-for="m in methods" :key="m.name" :class="styles.method">
            <strong>{{ m.name }}</strong>
            <span>{{ m.what }}</span>
          </div>
        </div>

        <h3 :class="styles.h3">Worked example</h3>
        <div :class="styles.example">
          <table :class="styles.exampleTable">
            <thead>
              <tr><th>Post</th><th>Read as</th><th>Substance</th><th>Trust</th><th>Weight</th></tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in example.posts" :key="i">
                <td><span :class="styles.exWho">{{ p.who }}</span><span :class="styles.exText">“{{ p.text }}”</span></td>
                <td :class="styles.num">{{ p.read }}</td>
                <td>{{ p.substance }}</td>
                <td>{{ p.trust }}</td>
                <td :class="styles.num">{{ p.weight }}</td>
              </tr>
            </tbody>
          </table>
          <ol :class="styles.exampleSteps">
            <li v-for="[name, calc] in example.steps" :key="name">
              <strong>{{ name }}</strong>
              <code>{{ calc }}</code>
            </li>
          </ol>
          <p :class="styles.exampleVerdict">{{ example.verdict }}</p>
        </div>
      </section>

      <section :class="styles.section">
        <h2 :class="styles.h2">Things worth knowing</h2>
        <div :class="styles.notes">
          <div v-for="[head, body] in notes" :key="head" :class="styles.note">
            <strong>{{ head }}</strong>
            <span>{{ body }}</span>
          </div>
        </div>
      </section>

      <section :class="styles.cta">
        <span>Sources: public posts on Reddit and X. Title data and artwork from TMDB. Critic and audience ratings from TMDB, IMDb, Rotten Tomatoes and Metacritic.</span>
        <router-link to="/" class="btn btn-primary">See what’s trending</router-link>
      </section>
    </div>
  </div>
</template>

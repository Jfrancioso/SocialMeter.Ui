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
    title: "Then it all rolls up to one number",
    body: "Everything above combines into a 0–100 reading where 50 means perfectly split. Confidence tells you how much weight sits behind the number; momentum shows whether the last two weeks are warmer or cooler than the overall read."
  }
];

const bands = [
  { label: "Cold", range: "0–34", color: "var(--meter-cold)", text: "The crowd is mostly down on it." },
  { label: "Lukewarm", range: "35–49", color: "var(--meter-lukewarm)", text: "Leaning negative or just mixed." },
  { label: "Warm", range: "50–64", color: "var(--meter-warm)", text: "More good than bad." },
  { label: "Hot", range: "65–79", color: "var(--meter-hot)", text: "People are into it." },
  { label: "Electric", range: "80–100", color: "var(--meter-electric)", text: "Near-universal love. Rare." }
];

const notes = [
  ["We only measure what’s current.", "Titles in theaters, on the air, coming soon, trending, this season’s picks (horror in October, love stories in February…), games topping Steam’s sellers and player charts, and anything that has gone electric. Everything else is browsable with critic ratings but locked — opinions on a ten-year-old film don’t change by the hour, and reading the whole internet for every title ever made isn’t worth anyone’s money."],
  ["It is not a critic score.", "Critics are on the ratings strip next to it. The meter is the audience, unfiltered — then filtered for bots."],
  ["It moves.", "Opinions shift after opening weekend, after a finale, after a Reddit thread blows up. Readings refresh every few hours."],
  ["Low confidence means low confidence.", "A reading built on a handful of posts is a hint, not a verdict. We say so right next to the number."],
  ["Deleted there, deleted here.", "We re-check every stored post against Reddit and X daily. If you deleted it, or a moderator removed it, it leaves our database and the score is recomputed without it. Nothing is kept longer than a year."],
  ["We keep some of the recipe to ourselves.", "Exact cut-offs for account age, reputation and weighting aren’t published. If they were, the first thing anyone would do is build accounts that just clear them."]
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

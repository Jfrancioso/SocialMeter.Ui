<script setup>
import styles from "./PrivacyPage.module.css";

// Plain-language privacy notice. Keep it in step with what the API actually stores (Domain/Models/SocialPost.cs) and
// the retention settings in appsettings.json; change the date below whenever the substance changes.
const updated = "October 22, 2026";
const contact = "privacy@chatterbub.com";
</script>

<template>
  <div :class="styles.page">
    <div class="container">
      <article :class="styles.doc">
        <header :class="styles.head">
          <span :class="styles.eyebrow">Privacy</span>
          <h1 :class="styles.title">What Chatterbub collects, and why</h1>
          <p :class="styles.lede">
            Chatterbub has no accounts, no ads and no tracking cookies. It reads public posts about movies, shows and
            games to work out how people feel about them. This page says what that involves.
          </p>
          <p :class="styles.updated">Last updated {{ updated }}</p>
        </header>

        <section :class="styles.section">
          <h2 :class="styles.h2">Public posts we read</h2>
          <p>
            For each title we collect public posts from Reddit and X and public reviews from Steam that mention it. For
            each post we keep its text, the author’s public username, a link to the post and its images, its upvotes and
            replies (and playtime for Steam reviews), and the account’s age and standing on that platform.
          </p>
          <p>
            We use this only to calculate a title’s score and to show some of the posts behind it. We don’t build profiles
            of people, follow anyone across titles, or sell or share the data.
          </p>
        </section>

        <section :class="styles.section">
          <h2 :class="styles.h2">How long we keep it</h2>
          <ul :class="styles.list">
            <li>We delete Reddit and X posts once they’re a year old.</li>
            <li>We delete Steam reviews once they’re 120 days old.</li>
            <li>We regularly recheck the posts we hold. If a post is deleted where it was published, we delete it here too.</li>
          </ul>
        </section>

        <section :class="styles.section">
          <h2 :class="styles.h2">Services that handle data for us</h2>
          <ul :class="styles.list">
            <li><strong>Anthropic</strong> (the Claude API) reads post text to judge how the author feels about the title. Under Anthropic’s commercial terms, that text isn’t used to train its models.</li>
            <li><strong>Microsoft Azure</strong> runs the service and its database.</li>
            <li><strong>Cloudflare</strong> delivers the site, blocks abuse and counts visits without cookies.</li>
            <li><strong>TMDB, OMDb, IMDb, Rotten Tomatoes, Metacritic and Steam</strong> provide title details and ratings. We send them only which title we’re looking up, never anything about you.</li>
          </ul>
        </section>

        <section :class="styles.section">
          <h2 :class="styles.h2">When you visit</h2>
          <ul :class="styles.list">
            <li>You don’t sign up and we don’t set cookies. Cloudflare may set a strictly necessary security cookie.</li>
            <li>Your browser saves a few display settings on your device, like the spoiler shield and which panels are open. They’re never sent to us.</li>
            <li>Cloudflare and Azure receive your IP address to deliver pages and enforce rate limits. Rate-limit records are kept in memory and cleared within an hour.</li>
            <li>Posters, post images and fonts load from TMDB, Steam, Reddit, X and Google Fonts. Those services receive your IP address, just as they would from any other site that shows their images.</li>
          </ul>
        </section>

        <section :class="styles.section">
          <h2 :class="styles.h2">Removing your post</h2>
          <p>
            If you delete a post where you published it, it disappears from Chatterbub the next time we check. To have a
            post removed sooner, or to ask anything about this page, email
            <a :href="`mailto:${contact}`" :class="styles.link">{{ contact }}</a> with a link to the post.
          </p>
        </section>
      </article>
    </div>
  </div>
</template>

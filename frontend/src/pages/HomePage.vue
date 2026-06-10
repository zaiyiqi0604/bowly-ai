<template>
  <section class="card home-hero">
    <p class="tagline">Practice with confidence.</p>
    <h1>Bowly AI is a gentle practice companion for young violin players.</h1>
    <p class="muted">
      Bowly listens, watches, and encourages with calm coaching so children feel motivated,
      supported, and consistent between lessons.
    </p>
    <div class="actions">
      <RouterLink class="button-link primary" to="/practice">Start Practice</RouterLink>
      <RouterLink class="button-link secondary" to="/demo">Open Demo Mode</RouterLink>
      <RouterLink class="button-link secondary" to="/report">View Parent Report</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.home-hero {
  padding: 32px;
}

h1 {
  font-size: clamp(1.6rem, 3vw, 2.3rem);
  margin: 10px 0 12px;
  max-width: 720px;
}

.tagline {
  margin: 0;
  color: #5948ad;
  font-weight: 700;
}

.actions {
  margin-top: 18px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.button-link {
  text-decoration: none;
  padding: 10px 12px;
  border-radius: 10px;
  font-weight: 600;
}

.primary {
  background: var(--lavender-500);
  color: white;
}

.secondary {
  background: #efe7db;
  color: #352d49;
}
</style>

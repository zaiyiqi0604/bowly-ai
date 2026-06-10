<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="brand">
        <span class="brand-dot"></span>
        <span>Bowly AI</span>
      </div>
      <nav class="nav-links">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/practice">Practice</RouterLink>
        <RouterLink to="/report">Parent Report</RouterLink>
        <RouterLink to="/demo">Demo</RouterLink>
      </nav>
    </header>
    <main class="app-main">
      <RouterView />
    </main>
  </div>
</template>

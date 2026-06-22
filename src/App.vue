<template>
  <div class="min-vh-100 bg-light">
    <nav class="navbar navbar-expand-md navbar-light bg-white sticky-top border-bottom shadow-sm">
      <div class="container">
        <router-link to="/" class="navbar-brand d-flex align-items-center gap-2">
          <span class="d-inline-flex align-items-center justify-content-center rounded"
            style="width:32px;height:32px;background:linear-gradient(135deg,#2563eb,#4338ca)">
            <i class="bi bi-layers text-white" style="font-size:1.1rem"></i>
          </span>
           <span class="fw-bold">Monitor de Revistas OA</span>
        </router-link>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navMenu">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navMenu">
          <ul class="navbar-nav ms-auto gap-2">
            <li class="nav-item">
              <router-link to="/" class="nav-link" exact-active-class="active">
                <i class="bi bi-building me-1"></i>Universidades
              </router-link>
            </li>
            <li class="nav-item">
              <router-link to="/ranking" class="nav-link" active-class="active">
                <i class="bi bi-trophy me-1"></i>Ranking
              </router-link>
            </li>
          </ul>
        </div>
      </div>
    </nav>

    <main class="py-4">
      <div class="container">
        <router-view />
      </div>
    </main>
  </div>
</template>

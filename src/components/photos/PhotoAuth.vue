<template>
  <div class="photo-auth">
    <div class="auth-card">
      <div class="auth-icon">🔐</div>
      <h2 class="auth-title">私密相册</h2>
      <p class="auth-desc">请输入访问密码</p>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="input-wrapper">
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="输入密码..."
            class="auth-input"
            :class="{ error: errorMessage }"
            :disabled="loading"
            autocomplete="current-password"
          />
          <button
            type="button"
            class="toggle-password"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? "🙈" : "👁️" }}
          </button>
        </div>

        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

        <button type="submit" class="auth-btn" :disabled="loading || !password">
          <span v-if="loading" class="loading-spinner"></span>
          {{ loading ? "验证中..." : "进入相册" }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { authenticate } from "@/api/photoApi";

const emit = defineEmits<{
  (e: "success"): void;
}>();

const password = ref("");
const showPassword = ref(false);
const loading = ref(false);
const errorMessage = ref("");

async function handleSubmit() {
  if (!password.value || loading.value) return;

  loading.value = true;
  errorMessage.value = "";

  try {
    const success = await authenticate(password.value);
    if (success) {
      emit("success");
    } else {
      errorMessage.value = "密码错误，请重试";
      password.value = "";
    }
  } catch (error) {
    errorMessage.value = "网络错误，请稍后重试";
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.photo-auth {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.auth-card {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 3rem 2.5rem;
  text-align: center;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.5);
}

.auth-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.auth-title {
  font-size: 1.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #6366f1, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 0.5rem;
}

.auth-desc {
  color: #64748b;
  font-size: 0.95rem;
  margin-bottom: 2rem;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.input-wrapper {
  position: relative;
}

.auth-input {
  width: 100%;
  padding: 1rem 3rem 1rem 1.25rem;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  font-size: 1rem;
  outline: none;
  transition: all 0.3s ease;
  background: rgba(255, 255, 255, 0.9);
}

.auth-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

.auth-input.error {
  border-color: #ef4444;
}

.auth-input::placeholder {
  color: #94a3b8;
}

.toggle-password {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.25rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.toggle-password:hover {
  opacity: 1;
}

.error-message {
  color: #ef4444;
  font-size: 0.85rem;
  text-align: left;
  margin: -0.5rem 0 0 0.25rem;
}

.auth-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 0.5rem;
}

.auth-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(99, 102, 241, 0.4);
}

.auth-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>

<script setup lang="ts">
import { ref } from 'vue';

const response = ref<string>();
const err = ref<boolean>(false);

function startLinkedInAuthorization() {
  fetch('/api/login', {
    method: 'POST',
  })
      .then(response => response.json())
      .then(({ redirectUrl }) => {
        if (redirectUrl) {
          console.log('redirectUrl frontend', redirectUrl)
          // Redirect the user to the received URL
          location.href = redirectUrl;
        } else {
          err.value = true;
          console.error('Redirect URL missing from the response');
        }
      })
      .catch(() => {
        err.value = true;
      });
}
</script>

<template>
  <div class="box">
    <button class="linkedin-btn" @click="startLinkedInAuthorization">
      Login with LinkedIn
    </button>
    <div v-if="response">{{ response }}</div>
    <div v-if="err" class="error">Something went wrong.</div>
  </div>
</template>

<style scoped>
form {
  display: flex;
  flex-direction: column;
}

button {
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 5px;
  border: none;
  cursor: pointer;
}

.linkedin-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #0077b5;
  color: white;
  font-weight: normal;
  font-size: 18px;

  padding: 15px 20px;;
  margin-top: 20px;
  border-radius: 5px;
  border: none;
  cursor: pointer;
}

.linkedin-btn:hover {
  background-color: #005582;
}

.error {
  color: #da8686;
}
</style>

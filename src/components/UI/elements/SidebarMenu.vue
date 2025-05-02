<template>
  <div
      class="sidebar-menu"
      :style="{
      transform: `translateX(${visible ? 0 : '-100%'})`,
      maxHeight: visible ? `${contentHeight}px` : '0'
    }"
  >
    <div ref="content">
      <slot />
    </div>
  </div>
</template>

<script>
export default {
  props: {
    visible: Boolean
  },

  data() {
    return {
      content: null,
      contentHeight: 0
    }
  },

  watch: {
    visible() {
      this.updateHeight()
    }
  },

  mounted() {
    this.updateHeight()
  },

  methods: {
    async updateHeight() {
      await this.$nextTick()
      if (this.$refs.content) {
        this.contentHeight = this.$refs.content.scrollHeight + 10
      }
    }
  }
}
</script>
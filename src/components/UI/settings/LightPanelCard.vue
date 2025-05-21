<template>
  <transition name="fade">
    <div class="settings-card">
      <div class="header">Light Panel</div>
      <div class="settings-section">
        <label>Height from Floor:</label>
        <div class="step-control">
          <button @click="decreaseFloorHeight" :disabled="!isWallLight">-</button>
          <span
              class="editable-value"
              :contenteditable="isWallLight"
              :class="{ disabled: !isWallLight }"
              @blur="isWallLight ? handleFloorHeightBlur : null"
              @keydown.enter.prevent="isWallLight ? handleEnter : null"
          >{{ displayFloorHeight }}</span>
          <button @click="increaseFloorHeight" :disabled="!isWallLight">+</button>
        </div>
      </div>
      <div class="preset-grid">
        <button
            v-for="preset in convertedFloorHeightPresets"
            :key="preset.value"
            :class="['preset-button', { active: isFloorHeightPresetActive(preset.value) }]"
            @click="isWallLight ? setFloorHeight(preset.value) : null"
            :disabled="!isWallLight"
        >
          {{ preset.display }}
        </button>
      </div>
      <hr>
      <div class="light-lists" v-if="!selectedGroup">
        <div class="group-header">Ceiling Lights</div>
        <div 
          v-for="light in ceilingLights" 
          :key="light.id"
          class="lamp-item"
          :class="{ 'highlighted': hoveredLightIds.includes(light.id) }"
          draggable="true"
          @mouseenter="setHoveredLight(light.id)"
          @mouseleave="setHoveredLight(null)"
          @dragstart="handleDragStart($event, { ...light, type: 'ceiling' })"
        >
          <div class="lamp-icon">○</div>
          <div class="lamp-info">Ceiling Light</div>
        </div>
        <div class="group-header">Wall Lights</div>
        <div 
          v-for="light in wallLights" 
          :key="light.id"
          class="lamp-item"
          :class="{ 'highlighted': hoveredLightIds.includes(light.id) }"
          draggable="true"
          @mouseenter="setHoveredLight(light.id)"
          @mouseleave="setHoveredLight(null)"
          @dragstart="handleDragStart($event, { ...light, type: 'wall-light' })"
        >
          <div class="lamp-icon">◐</div>
          <div class="lamp-info">
            Wall Light
            <div class="height-info">H={{ formatHeight(light.dimensions.floorHeight) }}</div>
          </div>
        </div>
      </div>
      <div class="group-content" v-else>
        <div class="group-header">
          <button class="back-button" @click="closeGroup">←</button>
          {{ selectedGroup.name }}
        </div>
        <div 
          v-for="light in selectedGroup.lights" 
          :key="light.id"
          class="lamp-item"
          :class="{ 'highlighted': hoveredLightIds.includes(light.id) }"
          @mouseenter="setHoveredLight(light.id)"
          @mouseleave="setHoveredLight(null)"
          @click="removeLightFromGroup(selectedGroup.id, light.id)"
        >
          <div class="lamp-icon">{{ light.type === 'ceiling' ? '○' : '◐' }}</div>
          <div class="lamp-info">
            {{ light.type === 'ceiling' ? 'Ceiling Light' : 'Wall Light' }}
            <div class="height-info" v-if="light.type === 'wall-light'">
              H={{ formatHeight(light.dimensions.floorHeight) }}
            </div>
          </div>
        </div>
      </div>
      <div class="tabs">
        <div class="tab-list">
          <div 
            v-for="group in lightGroups" 
            :key="group.id"
            class="tab"
            :class="{ 'active': selectedGroupId === group.id }"
            @click="selectGroup(group.id)"
            @mouseenter="handleGroupHover(group, true)"
            @mouseleave="handleGroupHover(group, false)"
            @dragover.prevent
            @drop="handleDrop($event, group.id)"
          >
            <div class="tab-name">{{ group.name }}</div>
            <div class="light-count">{{ getLightCount(group) }}</div>
          </div>
          <button class="add-tab" @click="createNewGroup">+</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  name: 'LightPanelCard',
  props: {
    floorHeight: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      required: true
    },
    isWallLight: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      floorHeightPresets: [
        { value: 1800, display: '180' },
        { value: 2000, display: '200' },
        { value: 2200, display: '220' },
      ],
      stepMap: {
        mm: { floorHeight: 50 },
        cm: { floorHeight: 5 },
        m: { floorHeight: 0.05 }
      },
      draggedLight: null
    }
  },
  computed: {
    ceilingLights() {
      return this.$store.getters['lights/getUngroupedCeilingLights'] || [];
    },
    wallLights() {
      return this.$store.getters['lights/getUngroupedWallLights'] || [];
    },
    hoveredLightIds() {
      return this.$store.getters['lights/getHoveredLightIds'];
    },
    lightGroups() {
      return this.$store.getters['lights/getLightGroups'] || [];
    },
    selectedGroupId() {
      return this.$store.state.lights.selectedGroupId;
    },
    selectedGroup() {
      return this.$store.getters['lights/getSelectedGroup'];
    },
    displayFloorHeight() {
      switch (this.unit) {
        case 'cm':
          return `${(this.floorHeight / 10).toFixed(0)} ${this.unit}`;
        case 'm':
          return `${(this.floorHeight / 1000).toFixed(2)} ${this.unit}`;
        default:
          return `${this.floorHeight} ${this.unit}`;
      }
    },
    convertedFloorHeightPresets() {
      return this.floorHeightPresets.map(preset => ({
        value: preset.value,
        display: this.convertToCurrentUnit(preset.value)
      }))
    }
  },
  methods: {
    getLightCount(group) {
      return group.lightRefs ? group.lightRefs.length : 0;
    },
    formatHeight(height) {
      // height comes in millimeters, convert accordingly
      switch (this.unit) {
        case 'cm':
          return `${(height / 10).toFixed(0)}`;
        case 'm':
          return `${(height / 1000).toFixed(2)}`;
        default: // mm
          return `${height}`;
      }
    },
    handleDragStart(event, light) {
      this.draggedLight = light;
      event.dataTransfer.effectAllowed = 'move';
    },
    handleDrop(event, groupId) {
      if (this.draggedLight) {
        this.$store.dispatch('lights/addLightToGroup', {
          groupId,
          light: this.draggedLight
        });
        this.draggedLight = null;
      }
    },
    async createNewGroup() {
      const name = prompt('Enter group name:', 'Group ' + (this.lightGroups.length + 1));
      if (name) {
        await this.$store.dispatch('lights/createLightGroup', name);
      }
    },
    selectGroup(groupId) {
      this.$store.dispatch('lights/setSelectedGroup', groupId);
    },
    closeGroup() {
      this.$store.dispatch('lights/setSelectedGroup', null);
    },
    removeLightFromGroup(groupId, lightId) {
      this.$store.dispatch('lights/removeLightFromGroup', { groupId, lightId });
    },
    setHoveredLight(lightId) {
      this.$store.commit('lights/setHoveredLight', lightId);
      this.$emit('hover-change');
    },
    handleGroupHover(group, isEntering) {
      if (isEntering) {
        // When hovering over a group, highlight all lights in the group
        const lightIds = group.lightRefs.map(ref => ref.id);
        this.$store.commit('lights/setHoveredLight', lightIds);
      } else {
        // When leaving the group, clear highlights
        this.$store.commit('lights/setHoveredLight', null);
      }
      this.$emit('hover-change');
    },
    convertToCurrentUnit(valueMM) {
      switch (this.unit) {
        case 'cm':
          return (valueMM / 10).toFixed(0)
        case 'm':
          return (valueMM / 1000).toFixed(2)
        default:
          return valueMM
      }
    },
    convertToMM(value) {
      const numberValue = parseFloat(value) || 0
      switch (this.unit) {
        case 'cm':
          return numberValue * 10
        case 'm':
          return numberValue * 1000
        default:
          return numberValue
      }
    },
    increaseFloorHeight() {
      if (!this.isWallLight) return;
      const step = this.stepMap[this.unit].floorHeight
      const newValue = this.floorHeight + this.convertToMM(step)
      this.$emit('update:floor-height', newValue)
    },
    decreaseFloorHeight() {
      if (!this.isWallLight) return;
      const step = this.stepMap[this.unit].floorHeight
      const newValue = Math.max(0, this.floorHeight - this.convertToMM(step))
      this.$emit('update:floor-height', newValue)
    },
    handleFloorHeightBlur(e) {
      if (!this.isWallLight) return;
      const raw = e.target.innerText.replace(/[^\d.,]/g, '').replace(',', '.')
      const value = parseFloat(raw) || 0
      const mmValue = Math.max(0, this.convertToMM(value))
      this.$emit('update:floor-height', mmValue)
      e.target.innerText = this.displayFloorHeight
    },
    handleEnter(e) {
      e.target.blur()
    },
    isFloorHeightPresetActive(value) {
      return this.floorHeight === value
    },
    setFloorHeight(value) {
      if (!this.isWallLight) return;
      this.$emit('update:floor-height', value)
    }
  }
}
</script>

<style scoped>
.editable-value {
  min-width: 70px;
  text-align: center;
  font-weight: 500;
  outline: none;
  border-radius: 4px;
}

.editable-value.disabled {
  background: #eee;
  color: #aaa;
  pointer-events: none;
}

.light-lists, .group-content {
  flex: 1;
  overflow-y: auto;
  margin: 8px 0;
  min-height: 0;
}

.group-header {
  font-size: 12px;
  color: #666;
  margin: 8px 0 4px;
  padding: 0 4px;
  display: flex;
  align-items: center;
}

.back-button {
  border: none;
  background: none;
  padding: 2px 8px;
  margin-right: 8px;
  cursor: pointer;
  font-size: 16px;
  color: #666;
}

.back-button:hover {
  color: #333;
}

.lamp-item {
  display: flex;
  align-items: center;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.lamp-item:hover, .lamp-item.highlighted {
  background-color: #f0f0f0;
}

.lamp-icon {
  font-size: 16px;
  margin-right: 8px;
  color: #008000;
  transition: all 0.2s ease;
}

.lamp-item:hover .lamp-icon,
.lamp-item.highlighted .lamp-icon {
  color: #00b300;
  text-shadow: 0 0 8px rgba(0, 179, 0, 0.4);
  transform: scale(1.1);
}

.lamp-info {
  font-size: 12px;
  color: #333;
  transition: color 0.2s ease;
}

.lamp-item:hover .lamp-info,
.lamp-item.highlighted .lamp-info {
  color: #000;
  font-weight: 500;
}

.height-info {
  font-size: 10px;
  color: #666;
  margin-top: 2px;
}

.tabs {
  border-top: 1px solid #eee;
  padding-top: 8px;
  margin-top: auto;
}

.tab-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding-bottom: 4px;
}

.tab {
  padding: 4px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  min-width: 0;
}

.tab-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.tab.active {
  background: #e0e0e0;
}

.tab:hover {
  background: #e8e8e8;
}

.light-count {
  background: #ddd;
  border-radius: 8px;
  padding: 0 4px;
  font-size: 10px;
  min-width: 14px;
  text-align: center;
  flex-shrink: 0;
}

.add-tab {
  padding: 4px 8px;
  background: none;
  border: 1px dashed #ccc;
  border-radius: 4px;
  cursor: pointer;
  color: #666;
  font-size: 12px;
  grid-column: span 2;
}

.add-tab:hover {
  background: #f5f5f5;
  border-color: #999;
}
</style>